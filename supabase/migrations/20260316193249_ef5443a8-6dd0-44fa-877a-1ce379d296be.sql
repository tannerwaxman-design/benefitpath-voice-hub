
-- Create voices table
CREATE TABLE public.voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'preset',
  provider TEXT NOT NULL DEFAULT 'eleven_labs',
  provider_voice_id TEXT NOT NULL,
  gender TEXT,
  accent TEXT,
  style TEXT,
  description TEXT,
  language TEXT DEFAULT 'en',
  recording_url TEXT,
  clone_status TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant users can view their voices and global voices"
  ON public.voices FOR SELECT TO authenticated
  USING (is_global = true OR tenant_id = get_user_tenant_id());

CREATE POLICY "Authenticated users can insert voices"
  ON public.voices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can update their voices"
  ON public.voices FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_global = false);

CREATE POLICY "Tenant users can delete their voices"
  ON public.voices FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND is_global = false);

-- Service role can manage all (for seeding)
CREATE POLICY "Service role full access on voices"
  ON public.voices FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_voices_updated_at
  BEFORE UPDATE ON public.voices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User voice collection table (tracks which preset voices a user has added)
CREATE TABLE public.user_voice_collection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  voice_id UUID REFERENCES public.voices(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, voice_id)
);

ALTER TABLE public.user_voice_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their collection"
  ON public.user_voice_collection FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can add to collection"
  ON public.user_voice_collection FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can remove from collection"
  ON public.user_voice_collection FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role full access on user_voice_collection"
  ON public.user_voice_collection FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
