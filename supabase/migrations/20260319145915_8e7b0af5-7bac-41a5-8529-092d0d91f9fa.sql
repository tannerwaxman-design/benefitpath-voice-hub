ALTER TABLE public.agents ADD COLUMN voicemail_method text NOT NULL DEFAULT 'live';
ALTER TABLE public.agents ADD COLUMN voicemail_audio_url text DEFAULT NULL;