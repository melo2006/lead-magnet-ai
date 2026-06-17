DROP POLICY IF EXISTS "Public can read call history for admin CRM" ON public.call_history;
DROP POLICY IF EXISTS "Public can read demo chats for admin CRM" ON public.demo_chat_interactions;
DROP POLICY IF EXISTS "Public can read demo leads for admin CRM" ON public.leads;

REVOKE SELECT ON public.call_history FROM anon;
REVOKE SELECT ON public.demo_chat_interactions FROM anon;
REVOKE SELECT ON public.leads FROM anon;

GRANT SELECT ON public.call_history TO authenticated;
GRANT SELECT ON public.demo_chat_interactions TO authenticated;
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.call_history TO service_role;
GRANT ALL ON public.demo_chat_interactions TO service_role;
GRANT ALL ON public.leads TO service_role;