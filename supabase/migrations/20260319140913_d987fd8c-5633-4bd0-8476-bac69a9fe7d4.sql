ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_summary text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recommended_action text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_score_updated_at timestamp with time zone DEFAULT NULL;