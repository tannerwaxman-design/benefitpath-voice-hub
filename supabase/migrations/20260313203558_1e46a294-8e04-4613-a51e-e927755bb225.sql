
-- Table for storing one platform API key per tenant
CREATE TABLE public.tenant_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- RLS
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their api key"
  ON public.tenant_api_keys FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can insert api key"
  ON public.tenant_api_keys FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin');

CREATE POLICY "Admins can update api key"
  ON public.tenant_api_keys FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin');

CREATE POLICY "Admins can delete api key"
  ON public.tenant_api_keys FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin');

-- Service role access for the public-api edge function
CREATE POLICY "Service role full access"
  ON public.tenant_api_keys FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
