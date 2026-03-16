
ALTER TABLE public.agents
  ADD COLUMN call_direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN inbound_greeting text DEFAULT 'Thank you for calling. How can I help you today?',
  ADD COLUMN answer_after_rings integer NOT NULL DEFAULT 2,
  ADD COLUMN after_hours_behavior text NOT NULL DEFAULT 'voicemail',
  ADD COLUMN after_hours_voicemail_message text DEFAULT 'Thank you for calling. Our office is currently closed. Please leave a message and we''ll call you back on the next business day.';
