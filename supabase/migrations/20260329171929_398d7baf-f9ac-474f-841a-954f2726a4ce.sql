
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  niche text,
  status text NOT NULL DEFAULT 'draft',
  target_filters jsonb DEFAULT '{}'::jsonb,
  prospect_count integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  emails_clicked integer DEFAULT 0,
  sms_sent integer DEFAULT 0,
  demos_viewed integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read campaigns" ON public.campaigns FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert campaigns" ON public.campaigns FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update campaigns" ON public.campaigns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete campaigns" ON public.campaigns FOR DELETE TO anon, authenticated USING (true);
