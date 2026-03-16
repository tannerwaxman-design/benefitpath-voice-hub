
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS voice_source text NOT NULL DEFAULT 'preset',
ADD COLUMN IF NOT EXISTS cloned_voice_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS voice_clone_status text DEFAULT NULL;
