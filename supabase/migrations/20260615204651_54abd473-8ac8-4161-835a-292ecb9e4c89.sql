
-- call_event_logs: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read call event logs" ON public.call_event_logs;
CREATE POLICY "Authenticated can read call event logs"
  ON public.call_event_logs FOR SELECT TO authenticated USING (true);

-- call_transfer_jobs: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read call transfer jobs" ON public.call_transfer_jobs;
CREATE POLICY "Authenticated can read call transfer jobs"
  ON public.call_transfer_jobs FOR SELECT TO authenticated USING (true);

-- demo_chat_interactions: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read demo_chat_interactions" ON public.demo_chat_interactions;
CREATE POLICY "Authenticated can read demo_chat_interactions"
  ON public.demo_chat_interactions FOR SELECT TO authenticated USING (true);

-- leads: remove anon read
DROP POLICY IF EXISTS "Anon can read own submitted lead" ON public.leads;

-- prospect_enrichment_jobs / items: explicit authenticated SELECT
CREATE POLICY "Authenticated can read prospect enrichment jobs"
  ON public.prospect_enrichment_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read prospect enrichment job items"
  ON public.prospect_enrichment_job_items FOR SELECT TO authenticated USING (true);

-- Storage: drop broad SELECT policy on website-screenshots bucket to prevent listing.
-- Direct public file URLs continue to work via the CDN for public buckets.
DROP POLICY IF EXISTS "Website screenshots are publicly accessible" ON storage.objects;
