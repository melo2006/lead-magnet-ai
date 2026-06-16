
CREATE TABLE public.sms_delivery_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NULL REFERENCES public.prospects(id) ON DELETE SET NULL,
  message_sid TEXT NULL UNIQUE,
  to_phone TEXT NOT NULL,
  from_phone TEXT NULL,
  body TEXT NULL,
  template_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error_code TEXT NULL,
  error_message TEXT NULL,
  is_opt_out BOOLEAN NOT NULL DEFAULT false,
  is_test BOOLEAN NOT NULL DEFAULT false,
  segments INTEGER NULL,
  price_usd NUMERIC(10,4) NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_log_sent_at ON public.sms_delivery_log(sent_at DESC);
CREATE INDEX idx_sms_log_status ON public.sms_delivery_log(status);
CREATE INDEX idx_sms_log_to_phone ON public.sms_delivery_log(to_phone);

GRANT SELECT ON public.sms_delivery_log TO anon, authenticated;
GRANT ALL ON public.sms_delivery_log TO service_role;
ALTER TABLE public.sms_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_log_read_all" ON public.sms_delivery_log FOR SELECT USING (true);
CREATE POLICY "sms_log_service_write" ON public.sms_delivery_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_sms_delivery_log_updated_at
  BEFORE UPDATE ON public.sms_delivery_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sms_opt_outs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_opt_outs TO anon, authenticated;
GRANT ALL ON public.sms_opt_outs TO service_role;
ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_opt_outs_read_all" ON public.sms_opt_outs FOR SELECT USING (true);
CREATE POLICY "sms_opt_outs_service_write" ON public.sms_opt_outs FOR ALL TO service_role USING (true) WITH CHECK (true);
