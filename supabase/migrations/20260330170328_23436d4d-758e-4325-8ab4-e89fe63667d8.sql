
-- Create table to track scraping usage and costs
CREATE TABLE public.scraping_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_type TEXT NOT NULL DEFAULT 'intent_leads',
  niche TEXT,
  location TEXT,
  platforms_used TEXT[] DEFAULT '{}',
  firecrawl_calls INTEGER NOT NULL DEFAULT 0,
  ai_calls INTEGER NOT NULL DEFAULT 0,
  leads_found INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public table for now since no auth)
ALTER TABLE public.scraping_usage ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth in this project)
CREATE POLICY "Allow all access to scraping_usage" ON public.scraping_usage FOR ALL USING (true) WITH CHECK (true);
