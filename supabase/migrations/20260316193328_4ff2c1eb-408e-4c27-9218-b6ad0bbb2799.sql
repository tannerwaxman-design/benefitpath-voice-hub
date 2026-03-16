
ALTER TABLE public.voices ALTER COLUMN tenant_id DROP NOT NULL;

-- Update RLS policy to handle null tenant_id for global voices
DROP POLICY "Tenant users can view their voices and global voices" ON public.voices;
CREATE POLICY "Tenant users can view their voices and global voices"
  ON public.voices FOR SELECT TO authenticated
  USING (is_global = true OR tenant_id = get_user_tenant_id());
