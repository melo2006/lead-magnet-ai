
ALTER TABLE public.scraped_ads
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS engagement_status text,
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS ad_country text;

CREATE INDEX IF NOT EXISTS scraped_ads_approval_status_idx ON public.scraped_ads (approval_status);
CREATE INDEX IF NOT EXISTS scraped_ads_engagement_status_idx ON public.scraped_ads (engagement_status);

ALTER TABLE public.ad_scan_jobs
  ADD COLUMN IF NOT EXISTS countries text[] NOT NULL DEFAULT ARRAY['US']::text[],
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT ARRAY['en']::text[],
  ADD COLUMN IF NOT EXISTS result_limit integer NOT NULL DEFAULT 25;
