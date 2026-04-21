ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS screenshot_tablet text,
  ADD COLUMN IF NOT EXISTS screenshot_mobile text;