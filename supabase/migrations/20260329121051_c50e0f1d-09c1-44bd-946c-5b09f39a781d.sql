
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new',
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS campaign_id text,
ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS email_opened_at timestamptz,
ADD COLUMN IF NOT EXISTS email_clicked_at timestamptz,
ADD COLUMN IF NOT EXISTS demo_viewed_at timestamptz,
ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS sms_clicked_at timestamptz,
ADD COLUMN IF NOT EXISTS demo_link text;
