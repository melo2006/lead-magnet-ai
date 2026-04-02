
CREATE POLICY "Anyone can read call history"
ON public.call_history
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can read call event logs"
ON public.call_event_logs
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can read call transfer jobs"
ON public.call_transfer_jobs
FOR SELECT
TO anon, authenticated
USING (true);
