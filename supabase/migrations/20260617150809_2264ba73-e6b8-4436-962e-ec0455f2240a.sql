CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(_email, '')) = 'melo2006@gmail.com';
$$;

DROP POLICY IF EXISTS "Authenticated can read call history" ON public.call_history;
CREATE POLICY "Admin can read call history"
ON public.call_history
FOR SELECT
TO authenticated
USING (public.is_admin_email((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Authenticated can read demo_chat_interactions" ON public.demo_chat_interactions;
CREATE POLICY "Admin can read demo_chat_interactions"
ON public.demo_chat_interactions
FOR SELECT
TO authenticated
USING (public.is_admin_email((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
CREATE POLICY "Admin can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.is_admin_email((auth.jwt() ->> 'email')));

GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO authenticated, service_role;
GRANT SELECT ON public.call_history TO authenticated;
GRANT SELECT ON public.demo_chat_interactions TO authenticated;
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.call_history TO service_role;
GRANT ALL ON public.demo_chat_interactions TO service_role;
GRANT ALL ON public.leads TO service_role;