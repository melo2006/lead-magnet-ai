create type public.call_transfer_status as enum ('not_requested', 'queued', 'dialing_caller', 'dialing_owner', 'awaiting_owner', 'joined', 'completed', 'failed', 'cancelled');

create table public.call_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  retell_call_id text not null unique,
  business_name text not null,
  website_url text,
  owner_name text,
  owner_email text,
  owner_phone text,
  caller_name text,
  caller_email text,
  caller_phone text,
  caller_phone_source text,
  call_status text not null default 'created',
  transfer_requested boolean not null default false,
  transfer_status public.call_transfer_status not null default 'not_requested',
  transfer_target_phone text,
  transfer_conference_name text,
  transfer_caller_call_sid text,
  transfer_owner_call_sid text,
  transfer_error text,
  summary text,
  next_step text,
  transcript text,
  key_points jsonb not null default '[]'::jsonb,
  recording_url text,
  duration_seconds integer,
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_call_history_created_at on public.call_history(created_at desc);
create index idx_call_history_lead_id on public.call_history(lead_id);
create index idx_call_history_prospect_id on public.call_history(prospect_id);
create index idx_call_history_transfer_status on public.call_history(transfer_status);

create table public.call_event_logs (
  id uuid primary key default gen_random_uuid(),
  call_history_id uuid not null references public.call_history(id) on delete cascade,
  event_type text not null,
  event_source text not null default 'system',
  message text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index idx_call_event_logs_call_history on public.call_event_logs(call_history_id, occurred_at desc);
create index idx_call_event_logs_event_type on public.call_event_logs(event_type);

create table public.call_transfer_jobs (
  id uuid primary key default gen_random_uuid(),
  call_history_id uuid not null references public.call_history(id) on delete cascade,
  retell_call_id text not null,
  target_phone text not null,
  caller_phone text,
  status public.call_transfer_status not null default 'queued',
  conference_name text,
  caller_call_sid text,
  owner_call_sid text,
  last_error text,
  attempts integer not null default 0,
  requested_at timestamp with time zone not null default now(),
  processed_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_call_transfer_jobs_call_history on public.call_transfer_jobs(call_history_id);
create index idx_call_transfer_jobs_status on public.call_transfer_jobs(status, requested_at desc);
create index idx_call_transfer_jobs_retell_call_id on public.call_transfer_jobs(retell_call_id);

alter table public.call_history enable row level security;
alter table public.call_event_logs enable row level security;
alter table public.call_transfer_jobs enable row level security;

create policy "Service role can manage call history"
on public.call_history
for all
to service_role
using (true)
with check (true);

create policy "Service role can manage call event logs"
on public.call_event_logs
for all
to service_role
using (true)
with check (true);

create policy "Service role can manage call transfer jobs"
on public.call_transfer_jobs
for all
to service_role
using (true)
with check (true);

create trigger update_call_history_updated_at
before update on public.call_history
for each row
execute function public.update_updated_at_column();

create trigger update_call_transfer_jobs_updated_at
before update on public.call_transfer_jobs
for each row
execute function public.update_updated_at_column();