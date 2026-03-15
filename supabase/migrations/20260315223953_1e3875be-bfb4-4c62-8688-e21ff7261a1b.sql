-- Add columns to store scraped website data
ALTER TABLE public.leads 
  ADD COLUMN brand_colors JSONB,
  ADD COLUMN brand_logo TEXT,
  ADD COLUMN brand_fonts JSONB,
  ADD COLUMN website_screenshot TEXT,
  ADD COLUMN website_content TEXT,
  ADD COLUMN website_title TEXT,
  ADD COLUMN website_description TEXT,
  ADD COLUMN scan_status TEXT NOT NULL DEFAULT 'pending';

-- Allow anon to update scan results (edge function uses service role anyway)
CREATE POLICY "Service role can update leads"
  ON public.leads
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);