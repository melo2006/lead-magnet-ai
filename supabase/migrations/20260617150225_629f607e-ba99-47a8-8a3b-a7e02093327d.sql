GRANT SELECT ON public.call_history TO anon, authenticated;
GRANT SELECT ON public.demo_chat_interactions TO anon, authenticated;
GRANT SELECT ON public.leads TO anon, authenticated;
GRANT ALL ON public.call_history TO service_role;
GRANT ALL ON public.demo_chat_interactions TO service_role;
GRANT ALL ON public.leads TO service_role;

DROP POLICY IF EXISTS "Public can read call history for admin CRM" ON public.call_history;
CREATE POLICY "Public can read call history for admin CRM"
ON public.call_history
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Public can read demo chats for admin CRM" ON public.demo_chat_interactions;
CREATE POLICY "Public can read demo chats for admin CRM"
ON public.demo_chat_interactions
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Public can read demo leads for admin CRM" ON public.leads;
CREATE POLICY "Public can read demo leads for admin CRM"
ON public.leads
FOR SELECT
TO anon
USING (true);