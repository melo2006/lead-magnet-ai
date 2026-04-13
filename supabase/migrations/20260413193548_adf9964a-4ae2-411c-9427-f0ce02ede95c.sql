
CREATE TABLE public.demo_chat_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  website_url TEXT,
  caller_name TEXT,
  caller_email TEXT,
  caller_phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  ai_interest_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_chat_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demo_chat_interactions"
ON public.demo_chat_interactions FOR SELECT
TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert demo_chat_interactions"
ON public.demo_chat_interactions FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Service role full access on demo_chat_interactions"
ON public.demo_chat_interactions FOR ALL
TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_demo_chat_session ON public.demo_chat_interactions(session_id);
CREATE INDEX idx_demo_chat_lead ON public.demo_chat_interactions(lead_id);
CREATE INDEX idx_demo_chat_prospect ON public.demo_chat_interactions(prospect_id);
