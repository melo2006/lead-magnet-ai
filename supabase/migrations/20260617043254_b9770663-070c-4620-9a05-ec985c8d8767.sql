CREATE OR REPLACE FUNCTION public.create_demo_lead(
  _business_name text,
  _full_name text,
  _phone text,
  _email text,
  _website_url text,
  _niche text DEFAULT 'general',
  _secondary_url text DEFAULT NULL,
  _scan_status text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead_id uuid;
BEGIN
  INSERT INTO public.leads (
    business_name,
    full_name,
    phone,
    email,
    website_url,
    secondary_url,
    niche,
    scan_status
  ) VALUES (
    NULLIF(BTRIM(_business_name), ''),
    NULLIF(BTRIM(_full_name), ''),
    NULLIF(BTRIM(_phone), ''),
    NULLIF(BTRIM(_email), ''),
    NULLIF(BTRIM(_website_url), ''),
    NULLIF(BTRIM(_secondary_url), ''),
    COALESCE(NULLIF(BTRIM(_niche), ''), 'general'),
    NULLIF(BTRIM(_scan_status), '')
  )
  RETURNING id INTO _lead_id;

  RETURN _lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_demo_lead(text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_demo_lead(text, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_demo_lead(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_demo_lead(text, text, text, text, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.set_demo_lead_uploads(
  _lead_id uuid,
  _uploaded_files text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET uploaded_files = COALESCE(_uploaded_files, ARRAY[]::text[])
  WHERE id = _lead_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_demo_lead_uploads(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_demo_lead_uploads(uuid, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.set_demo_lead_uploads(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_demo_lead_uploads(uuid, text[]) TO service_role;