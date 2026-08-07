CREATE TABLE public.voice_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  max_call_seconds integer NOT NULL DEFAULT 300,
  max_calls_per_visitor_per_day integer NOT NULL DEFAULT 5,
  max_calls_per_day_total integer NOT NULL DEFAULT 200,
  estimated_cost_per_minute numeric(10,4) NOT NULL DEFAULT 0.16,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.voice_guardrails TO authenticated;
GRANT ALL ON public.voice_guardrails TO service_role;
ALTER TABLE public.voice_guardrails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view guardrails" ON public.voice_guardrails
  FOR SELECT TO authenticated USING (public.is_admin_email(auth.jwt() ->> 'email'));
CREATE POLICY "Admins can update guardrails" ON public.voice_guardrails
  FOR UPDATE TO authenticated USING (public.is_admin_email(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_admin_email(auth.jwt() ->> 'email'));
CREATE POLICY "Admins can insert guardrails" ON public.voice_guardrails
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_email(auth.jwt() ->> 'email'));

CREATE TRIGGER update_voice_guardrails_updated_at
  BEFORE UPDATE ON public.voice_guardrails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.voice_guardrails DEFAULT VALUES;

CREATE TABLE public.demo_call_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key text,
  ip_address text,
  business_name text,
  website_url text,
  allowed boolean NOT NULL DEFAULT true,
  blocked_reason text,
  max_call_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demo_call_attempts TO authenticated;
GRANT ALL ON public.demo_call_attempts TO service_role;
ALTER TABLE public.demo_call_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view demo call attempts" ON public.demo_call_attempts
  FOR SELECT TO authenticated USING (public.is_admin_email(auth.jwt() ->> 'email'));

CREATE INDEX idx_demo_call_attempts_created_at ON public.demo_call_attempts (created_at DESC);
CREATE INDEX idx_demo_call_attempts_visitor ON public.demo_call_attempts (visitor_key, created_at DESC);