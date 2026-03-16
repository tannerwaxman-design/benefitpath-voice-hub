
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_feedback jsonb DEFAULT NULL;
