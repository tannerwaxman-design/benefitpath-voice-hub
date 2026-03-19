-- SOA config columns on agents
ALTER TABLE public.agents
  ADD COLUMN soa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN soa_script text DEFAULT 'Before we discuss any specific plan options, I need to let you know this is a conversation about Medicare insurance plans. Federal regulations require me to get your verbal permission before we go over specific options. Today I''d like to discuss [SELECTED_PLAN_TYPES]. Do I have your permission to go over those with you?',
  ADD COLUMN soa_plan_types jsonb NOT NULL DEFAULT '["Medicare Advantage (MA) plans, including HMO, PPO, and PFFS", "Medicare Supplement (Medigap) plans", "Medicare Prescription Drug Plans (Part D / PDP)"]'::jsonb,
  ADD COLUMN soa_timing text NOT NULL DEFAULT 'after_greeting';

-- SOA data columns on calls
ALTER TABLE public.calls
  ADD COLUMN soa_collected boolean NOT NULL DEFAULT false,
  ADD COLUMN soa_consent_given boolean DEFAULT NULL,
  ADD COLUMN soa_timestamp_seconds integer DEFAULT NULL,
  ADD COLUMN soa_plan_types jsonb DEFAULT NULL,
  ADD COLUMN soa_response_text text DEFAULT NULL;