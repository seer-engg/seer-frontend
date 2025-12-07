-- Add columns for API key and query usage tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS query_count INTEGER NOT NULL DEFAULT 0;