-- Add explicit business name captured from the lead form
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS business_name text;

-- Backfill existing rows with best available value
UPDATE public.leads
SET business_name = COALESCE(
  NULLIF(trim(website_title), ''),
  NULLIF(split_part(regexp_replace(website_url, '^https?://(www\.)?', ''), '/', 1), ''),
  'Business'
)
WHERE business_name IS NULL OR trim(business_name) = '';

-- Enforce required business name for all new leads
ALTER TABLE public.leads
ALTER COLUMN business_name SET NOT NULL;

ALTER TABLE public.leads
ADD CONSTRAINT leads_business_name_not_blank
CHECK (char_length(trim(business_name)) > 0);

-- Make email optional as requested (owner can still provide it for recaps)
ALTER TABLE public.leads
ALTER COLUMN email DROP NOT NULL;