
CREATE TABLE public.imported_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  source_filename text,
  lead_count integer NOT NULL DEFAULT 0,
  niche text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read imported_lists" ON public.imported_lists FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert imported_lists" ON public.imported_lists FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update imported_lists" ON public.imported_lists FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete imported_lists" ON public.imported_lists FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.imported_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES public.imported_lists(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  website_url text,
  email text,
  phone text,
  city text,
  state text,
  category text,
  social_media_score integer DEFAULT 0,
  website_quality_score integer DEFAULT 0,
  ai_chatbot_detected boolean DEFAULT false,
  lead_score text DEFAULT 'Cold',
  notes text,
  phone_type text,
  demo_sent boolean DEFAULT false,
  demo_sent_at timestamp with time zone,
  demo_viewed_at timestamp with time zone,
  status text DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read imported_leads" ON public.imported_leads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert imported_leads" ON public.imported_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update imported_leads" ON public.imported_leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete imported_leads" ON public.imported_leads FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_imported_lists_updated_at BEFORE UPDATE ON public.imported_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_imported_leads_updated_at BEFORE UPDATE ON public.imported_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
