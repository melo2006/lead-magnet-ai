
CREATE TABLE public.prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id text NOT NULL UNIQUE,
  business_name text NOT NULL,
  formatted_address text,
  phone text,
  website_url text,
  google_maps_url text,
  rating numeric(2,1),
  review_count integer DEFAULT 0,
  business_types jsonb DEFAULT '[]'::jsonb,
  primary_type text,
  niche text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',
  photos jsonb DEFAULT '[]'::jsonb,
  opening_hours jsonb,
  has_website boolean DEFAULT false,
  website_quality_score integer DEFAULT 0,
  has_chat_widget boolean DEFAULT false,
  has_voice_ai boolean DEFAULT false,
  has_online_booking boolean DEFAULT false,
  lead_score integer DEFAULT 0,
  lead_temperature text DEFAULT 'cold',
  status text DEFAULT 'new',
  notes text,
  tags jsonb DEFAULT '[]'::jsonb,
  last_contacted_at timestamp with time zone,
  search_query text,
  search_location text,
  search_radius integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prospects" ON public.prospects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert prospects" ON public.prospects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update prospects" ON public.prospects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
