
CREATE TABLE IF NOT EXISTS public.short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  prospect_id UUID,
  scraped_ad_id UUID,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_links_slug ON public.short_links(slug);
CREATE INDEX IF NOT EXISTS idx_short_links_prospect ON public.short_links(prospect_id);
CREATE INDEX IF NOT EXISTS idx_short_links_ad ON public.short_links(scraped_ad_id);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short_links"
  ON public.short_links FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert short_links"
  ON public.short_links FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update short_links"
  ON public.short_links FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages short_links"
  ON public.short_links FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_short_links_updated_at
  BEFORE UPDATE ON public.short_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
