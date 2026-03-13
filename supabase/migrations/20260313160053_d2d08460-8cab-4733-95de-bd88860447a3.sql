-- Add Twilio credentials to tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS twilio_account_sid text,
  ADD COLUMN IF NOT EXISTS twilio_auth_token text;

-- Add provider column to phone_numbers table  
ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'vapi';

COMMENT ON COLUMN public.phone_numbers.provider IS 'Phone number provider: vapi or twilio';