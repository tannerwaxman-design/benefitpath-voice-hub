
-- Add compiled_system_prompt column to agents
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS compiled_system_prompt TEXT;

-- Enable pg_cron and pg_net extensions for campaign scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
