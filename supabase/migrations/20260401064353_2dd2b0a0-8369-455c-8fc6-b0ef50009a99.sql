INSERT INTO storage.buckets (id, name, public)
VALUES ('website-screenshots', 'website-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Website screenshots are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'website-screenshots');

CREATE POLICY "Service role can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'website-screenshots');

CREATE POLICY "Service role can update screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'website-screenshots');