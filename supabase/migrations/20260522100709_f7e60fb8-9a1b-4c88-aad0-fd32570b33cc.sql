CREATE TABLE public.ad_scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche text NOT NULL,
  location text,
  platforms text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued',
  ads_found integer NOT NULL DEFAULT 0,
  ads_converted integer NOT NULL DEFAULT 0,
  total_cost_usd numeric(10,3) NOT NULL DEFAULT 0,
  last_error text,
  platform_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.ad_scan_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ad_scan_jobs" ON public.ad_scan_jobs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert ad_scan_jobs" ON public.ad_scan_jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update ad_scan_jobs" ON public.ad_scan_jobs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete ad_scan_jobs" ON public.ad_scan_jobs FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Service role manages ad_scan_jobs" ON public.ad_scan_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_ad_scan_jobs_updated_at BEFORE UPDATE ON public.ad_scan_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.scraped_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id uuid REFERENCES public.ad_scan_jobs(id) ON DELETE CASCADE,
  platform text NOT NULL,
  ad_id text,
  advertiser_name text NOT NULL,
  advertiser_handle text,
  landing_url text NOT NULL,
  cta_text text,
  ad_creative_text text,
  ad_media_url text,
  posted_at timestamptz,
  source_ad_url text,
  prospect_id uuid,
  comment_template text,
  status text NOT NULL DEFAULT 'new',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, landing_url)
);

ALTER TABLE public.scraped_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scraped_ads" ON public.scraped_ads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert scraped_ads" ON public.scraped_ads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update scraped_ads" ON public.scraped_ads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete scraped_ads" ON public.scraped_ads FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Service role manages scraped_ads" ON public.scraped_ads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_scraped_ads_updated_at BEFORE UPDATE ON public.scraped_ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scraped_ads_scan_job ON public.scraped_ads(scan_job_id);
CREATE INDEX idx_scraped_ads_status ON public.scraped_ads(status);
CREATE INDEX idx_scraped_ads_platform ON public.scraped_ads(platform);
CREATE INDEX idx_ad_scan_jobs_status ON public.ad_scan_jobs(status);