
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS coaching_category text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS coaching_tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coaching_highlights jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS coaching_script_suggestion text DEFAULT NULL;
