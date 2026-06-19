
-- ============================================================
-- 1. Lock CRM tables to authenticated users only
-- ============================================================
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ad_scan_jobs','campaigns','campaign_sequences','campaign_sequence_steps',
    'imported_leads','imported_lists','intent_leads','prospects',
    'prospect_sequence_enrollments','scraped_ads','sms_delivery_log','sms_opt_outs'
  ])
  LOOP
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t
        AND policyname ILIKE 'Anyone can %'
           OR (schemaname='public' AND tablename=t AND policyname IN
              ('sms_log_read_all','sms_opt_outs_read_all'))
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Re-create permissive but authenticated-only policies
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ad_scan_jobs','campaigns','campaign_sequences','campaign_sequence_steps',
    'imported_leads','imported_lists','intent_leads','prospects',
    'prospect_sequence_enrollments','scraped_ads'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Authenticated full access to %1$s" ON public.%1$I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- sms_delivery_log: authenticated read; service_role full (existing)
CREATE POLICY "Authenticated read sms_delivery_log"
  ON public.sms_delivery_log FOR SELECT TO authenticated USING (true);

-- sms_opt_outs: authenticated read; service_role full (existing).
-- Also allow authenticated insert so CRM users can manually opt someone out.
CREATE POLICY "Authenticated read sms_opt_outs"
  ON public.sms_opt_outs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert sms_opt_outs"
  ON public.sms_opt_outs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 2. Revoke anon table grants so RLS isn't the only barrier
-- ============================================================
REVOKE ALL ON public.ad_scan_jobs,
              public.campaigns,
              public.campaign_sequences,
              public.campaign_sequence_steps,
              public.imported_leads,
              public.imported_lists,
              public.intent_leads,
              public.prospects,
              public.prospect_sequence_enrollments,
              public.scraped_ads,
              public.sms_delivery_log,
              public.sms_opt_outs
       FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE
   ON public.ad_scan_jobs,
      public.campaigns,
      public.campaign_sequences,
      public.campaign_sequence_steps,
      public.imported_leads,
      public.imported_lists,
      public.intent_leads,
      public.prospects,
      public.prospect_sequence_enrollments,
      public.scraped_ads
   TO authenticated;
GRANT SELECT ON public.sms_delivery_log, public.sms_opt_outs TO authenticated;
GRANT INSERT ON public.sms_opt_outs TO authenticated;

-- ============================================================
-- 3. Public demo page: tight RPC returning only owner contact
--    for a single prospect id (replaces blanket anon SELECT).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_demo_prospect_owner(_id uuid)
RETURNS TABLE(owner_name text, owner_email text, owner_phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT owner_name, owner_email, owner_phone
  FROM public.prospects
  WHERE id = _id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_demo_prospect_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_demo_prospect_owner(uuid) TO anon, authenticated;

-- ============================================================
-- 4. Lock internal worker SECURITY DEFINER fns from anon/auth
-- ============================================================
REVOKE EXECUTE ON FUNCTION
  public.claim_next_prospect_enrichment_items(uuid, integer),
  public.requeue_stalled_prospect_enrichment_items(integer),
  public.refresh_prospect_enrichment_job(uuid)
FROM PUBLIC, anon, authenticated;
-- service_role retains access via default ownership

-- ============================================================
-- 5. lead-uploads bucket: add DELETE policy
-- ============================================================
CREATE POLICY "Authenticated can delete lead-uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lead-uploads');
CREATE POLICY "Service role manages lead-uploads"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'lead-uploads') WITH CHECK (bucket_id = 'lead-uploads');

-- ============================================================
-- 6. Remove prospect_sequence_enrollments from realtime
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public'
      AND tablename='prospect_sequence_enrollments'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.prospect_sequence_enrollments;
  END IF;
END $$;
