create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'prospect_enrichment_job_status'
  ) then
    create type public.prospect_enrichment_job_status as enum ('queued', 'running', 'paused', 'completed', 'failed', 'stopped');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'prospect_enrichment_item_status'
  ) then
    create type public.prospect_enrichment_item_status as enum ('queued', 'processing', 'completed', 'failed');
  end if;
end $$;

create table if not exists public.prospect_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  label text,
  phase text not null default 'full_enrichment',
  status public.prospect_enrichment_job_status not null default 'queued',
  total integer not null default 0,
  completed integer not null default 0,
  failed integer not null default 0,
  emails_found integer not null default 0,
  phones_classified integer not null default 0,
  sms_ready integer not null default 0,
  total_cost_usd numeric(10,3) not null default 0,
  api_totals jsonb not null default '{}'::jsonb,
  recent_events jsonb not null default '[]'::jsonb,
  current_prospect_id uuid references public.prospects(id) on delete set null,
  current_prospect_name text,
  last_error text,
  auto_resume boolean not null default true,
  pause_requested boolean not null default false,
  stop_requested boolean not null default false,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  last_heartbeat_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.prospect_enrichment_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.prospect_enrichment_jobs(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  order_index integer not null default 0,
  status public.prospect_enrichment_item_status not null default 'queued',
  attempts integer not null default 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_error text,
  cost jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (job_id, prospect_id)
);

create unique index if not exists idx_one_active_prospect_enrichment_job
on public.prospect_enrichment_jobs ((true))
where status in ('queued', 'running', 'paused');

create index if not exists idx_prospect_enrichment_jobs_status_updated
on public.prospect_enrichment_jobs (status, updated_at desc);

create index if not exists idx_prospect_enrichment_job_items_job_status_order
on public.prospect_enrichment_job_items (job_id, status, order_index);

create index if not exists idx_prospect_enrichment_job_items_prospect
on public.prospect_enrichment_job_items (prospect_id);

alter table public.prospect_enrichment_jobs enable row level security;
alter table public.prospect_enrichment_job_items enable row level security;

drop policy if exists "Service role can manage prospect enrichment jobs" on public.prospect_enrichment_jobs;
create policy "Service role can manage prospect enrichment jobs"
on public.prospect_enrichment_jobs
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage prospect enrichment job items" on public.prospect_enrichment_job_items;
create policy "Service role can manage prospect enrichment job items"
on public.prospect_enrichment_job_items
for all
to service_role
using (true)
with check (true);

drop trigger if exists update_prospect_enrichment_jobs_updated_at on public.prospect_enrichment_jobs;
create trigger update_prospect_enrichment_jobs_updated_at
before update on public.prospect_enrichment_jobs
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_prospect_enrichment_job_items_updated_at on public.prospect_enrichment_job_items;
create trigger update_prospect_enrichment_job_items_updated_at
before update on public.prospect_enrichment_job_items
for each row
execute function public.update_updated_at_column();

create or replace function public.claim_next_prospect_enrichment_items(_job_id uuid, _limit integer default 1)
returns setof public.prospect_enrichment_job_items
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with next_items as (
    select i.id
    from public.prospect_enrichment_job_items i
    join public.prospect_enrichment_jobs j on j.id = i.job_id
    where i.job_id = _job_id
      and i.status = 'queued'
      and j.status in ('queued', 'running')
      and j.pause_requested = false
      and j.stop_requested = false
    order by i.order_index asc, i.created_at asc
    limit greatest(coalesce(_limit, 1), 1)
    for update of i skip locked
  )
  update public.prospect_enrichment_job_items i
  set status = 'processing',
      attempts = i.attempts + 1,
      started_at = coalesce(i.started_at, now()),
      updated_at = now(),
      last_error = null
  from next_items
  where i.id = next_items.id
  returning i.*;
end;
$$;

revoke all on function public.claim_next_prospect_enrichment_items(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_next_prospect_enrichment_items(uuid, integer) to service_role;

create or replace function public.refresh_prospect_enrichment_job(_job_id uuid)
returns public.prospect_enrichment_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  _job public.prospect_enrichment_jobs;
begin
  with item_counts as (
    select
      count(*) filter (where status in ('completed', 'failed'))::integer as completed_count,
      count(*) filter (where status = 'failed')::integer as failed_count
    from public.prospect_enrichment_job_items
    where job_id = _job_id
  ),
  cost_totals as (
    select
      coalesce(
        sum(
          case
            when jsonb_typeof(cost) = 'object' and cost ? 'total_usd' then (cost ->> 'total_usd')::numeric
            else 0
          end
        ),
        0
      )::numeric(10,3) as total_cost
    from public.prospect_enrichment_job_items
    where job_id = _job_id
  ),
  api_totals as (
    select coalesce(
      jsonb_object_agg(api_key, jsonb_build_object('calls', total_calls, 'cost', total_cost)),
      '{}'::jsonb
    ) as value
    from (
      select
        key as api_key,
        sum(coalesce((value ->> 'calls')::integer, 0))::integer as total_calls,
        round(sum(coalesce((value ->> 'cost')::numeric, 0)), 3) as total_cost
      from public.prospect_enrichment_job_items i
      cross join lateral jsonb_each(coalesce(i.cost -> 'breakdown', '{}'::jsonb))
      where i.job_id = _job_id
      group by key
    ) breakdown_totals
  ),
  contact_totals as (
    select
      count(*) filter (where i.status = 'completed' and coalesce(p.owner_email, p.email) is not null)::integer as emails_found_count,
      count(*) filter (where i.status = 'completed' and p.phone_type is not null)::integer as phones_classified_count,
      count(*) filter (where i.status = 'completed' and p.sms_capable = true)::integer as sms_ready_count
    from public.prospect_enrichment_job_items i
    join public.prospects p on p.id = i.prospect_id
    where i.job_id = _job_id
  )
  update public.prospect_enrichment_jobs j
  set completed = coalesce((select completed_count from item_counts), 0),
      failed = coalesce((select failed_count from item_counts), 0),
      emails_found = coalesce((select emails_found_count from contact_totals), 0),
      phones_classified = coalesce((select phones_classified_count from contact_totals), 0),
      sms_ready = coalesce((select sms_ready_count from contact_totals), 0),
      total_cost_usd = coalesce((select total_cost from cost_totals), 0),
      api_totals = coalesce((select value from api_totals), '{}'::jsonb),
      status = case
        when j.stop_requested then 'stopped'::public.prospect_enrichment_job_status
        when j.pause_requested then 'paused'::public.prospect_enrichment_job_status
        when coalesce((select completed_count from item_counts), 0) >= j.total and j.total > 0 then 'completed'::public.prospect_enrichment_job_status
        when j.status in ('queued', 'running') then 'running'::public.prospect_enrichment_job_status
        else j.status
      end,
      finished_at = case
        when coalesce((select completed_count from item_counts), 0) >= j.total and j.total > 0 then coalesce(j.finished_at, now())
        when j.pause_requested or j.stop_requested then j.finished_at
        else null
      end,
      last_heartbeat_at = now(),
      updated_at = now()
  where j.id = _job_id
  returning j.* into _job;

  return _job;
end;
$$;

revoke all on function public.refresh_prospect_enrichment_job(uuid) from public, anon, authenticated;
grant execute on function public.refresh_prospect_enrichment_job(uuid) to service_role;

create or replace function public.requeue_stalled_prospect_enrichment_items(_stale_minutes integer default 10)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _count integer := 0;
begin
  with stalled as (
    update public.prospect_enrichment_job_items i
    set status = 'queued',
        last_error = coalesce(i.last_error, 'Worker stalled or browser disconnected; automatically re-queued.'),
        updated_at = now()
    from public.prospect_enrichment_jobs j
    where i.job_id = j.id
      and i.status = 'processing'
      and i.updated_at < now() - make_interval(mins => greatest(coalesce(_stale_minutes, 10), 1))
      and j.auto_resume = true
      and j.pause_requested = false
      and j.stop_requested = false
      and j.status in ('queued', 'running')
    returning i.job_id
  )
  select count(*)::integer into _count from stalled;

  if _count > 0 then
    update public.prospect_enrichment_jobs j
    set status = 'queued',
        current_prospect_id = null,
        current_prospect_name = null,
        last_error = 'Recovered automatically after a stalled worker.',
        updated_at = now(),
        last_heartbeat_at = now()
    where j.auto_resume = true
      and j.pause_requested = false
      and j.stop_requested = false
      and exists (
        select 1
        from public.prospect_enrichment_job_items i
        where i.job_id = j.id
          and i.status = 'queued'
      );
  end if;

  return coalesce(_count, 0);
end;
$$;

revoke all on function public.requeue_stalled_prospect_enrichment_items(integer) from public, anon, authenticated;
grant execute on function public.requeue_stalled_prospect_enrichment_items(integer) to service_role;