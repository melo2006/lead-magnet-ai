CREATE OR REPLACE FUNCTION public.get_demo_lead(_lead_id uuid)
RETURNS TABLE (
  id uuid,
  updated_at timestamptz,
  full_name text,
  business_name text,
  email text,
  phone text,
  niche text,
  website_url text,
  website_screenshot text,
  screenshot_tablet text,
  screenshot_mobile text,
  website_title text,
  website_description text,
  website_content text,
  brand_colors jsonb,
  brand_logo text,
  scan_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.updated_at,
    l.full_name,
    l.business_name,
    l.email,
    l.phone,
    l.niche,
    l.website_url,
    l.website_screenshot,
    l.screenshot_tablet,
    l.screenshot_mobile,
    l.website_title,
    l.website_description,
    l.website_content,
    l.brand_colors,
    l.brand_logo,
    l.scan_status
  FROM public.leads l
  WHERE l.id = _lead_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_demo_lead(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_demo_lead(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_demo_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_demo_lead(uuid) TO service_role;