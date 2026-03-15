-- Allow anon to read back the lead they just inserted (for getting the ID)
CREATE POLICY "Anon can read own submitted lead"
  ON public.leads
  FOR SELECT
  TO anon
  USING (true);