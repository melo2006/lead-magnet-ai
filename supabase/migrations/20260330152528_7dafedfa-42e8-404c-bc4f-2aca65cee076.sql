
CREATE TABLE public.intent_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text,
  source_platform text NOT NULL DEFAULT 'unknown',
  post_content text,
  post_title text,
  author_name text,
  author_profile_url text,
  niche text NOT NULL,
  location text,
  intent_score integer NOT NULL DEFAULT 0,
  intent_category text,
  lead_temperature text NOT NULL DEFAULT 'cold',
  ai_summary text,
  ai_recommended_services text,
  posted_at timestamp with time zone,
  search_query text,
  search_location text,
  search_niche text,
  is_dismissed boolean NOT NULL DEFAULT false,
  added_to_crm boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.intent_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read intent_leads" ON public.intent_leads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert intent_leads" ON public.intent_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update intent_leads" ON public.intent_leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
