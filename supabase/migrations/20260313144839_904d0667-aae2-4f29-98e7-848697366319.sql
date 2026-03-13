
-- Add cost breakdown columns to calls table
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS cost_vapi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_transport numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_stt numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_llm numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_tts numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_breakdown jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cost_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_with_margin numeric DEFAULT 0;

-- Add margin config to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS margin_percent numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS hard_stop_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_alert_threshold numeric NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS usage_alert_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_cost_this_cycle numeric NOT NULL DEFAULT 0;
