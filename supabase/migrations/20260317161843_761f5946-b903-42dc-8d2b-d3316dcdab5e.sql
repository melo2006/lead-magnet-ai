
-- Add new columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS secondary_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS uploaded_files jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for lead file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-uploads',
  'lead-uploads',
  false,
  20971520,
  ARRAY['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload files to lead-uploads bucket (public form)
CREATE POLICY "Anyone can upload lead files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lead-uploads');

-- Allow service role to read lead files
CREATE POLICY "Service role can read lead files"
ON storage.objects FOR SELECT
USING (bucket_id = 'lead-uploads');
