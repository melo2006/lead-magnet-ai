
-- call_history: restrict reads to authenticated only
DROP POLICY IF EXISTS "Anyone can read call history" ON public.call_history;
CREATE POLICY "Authenticated can read call history"
  ON public.call_history FOR SELECT TO authenticated USING (true);

-- scraping_usage: restrict to authenticated + service role
DROP POLICY IF EXISTS "Allow all access to scraping_usage" ON public.scraping_usage;
CREATE POLICY "Authenticated can read scraping_usage"
  ON public.scraping_usage FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages scraping_usage"
  ON public.scraping_usage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- storage: lead-uploads bucket
DROP POLICY IF EXISTS "Anyone can upload lead files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read lead files" ON storage.objects;

CREATE POLICY "Authenticated can upload lead files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lead-uploads');

CREATE POLICY "Service role reads lead files"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'lead-uploads');
