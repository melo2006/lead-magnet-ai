ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS ai_analysis text,
ADD COLUMN IF NOT EXISTS ai_analyzed boolean DEFAULT false;