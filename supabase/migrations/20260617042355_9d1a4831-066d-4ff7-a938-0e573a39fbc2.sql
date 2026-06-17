GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

CREATE OR REPLACE FUNCTION public.create_demo_lead(
  _business_name text,
  _full_name text,
  _phone text,
  _email text,
  _website_url text,
  _niche text DEFAULT 'general'
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
    niche
  ) VALUES (
    NULLIF(BTRIM(_business_name), ''),
    NULLIF(BTRIM(_full_name), ''),
    NULLIF(BTRIM(_phone), ''),
    NULLIF(BTRIM(_email), ''),
    NULLIF(BTRIM(_website_url), ''),
    COALESCE(NULLIF(BTRIM(_niche), ''), 'general')
  )
  RETURNING id INTO _lead_id;

  RETURN _lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_demo_lead(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_demo_lead(text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_demo_lead(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_demo_lead(text, text, text, text, text, text) TO service_role;