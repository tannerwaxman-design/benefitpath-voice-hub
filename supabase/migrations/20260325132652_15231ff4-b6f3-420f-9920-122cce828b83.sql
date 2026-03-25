
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb NOT NULL DEFAULT '{"agent_created": false, "test_call_made": false, "voice_selected": false, "contacts_uploaded": false, "phone_imported": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_checklist_dismissed boolean NOT NULL DEFAULT false;
