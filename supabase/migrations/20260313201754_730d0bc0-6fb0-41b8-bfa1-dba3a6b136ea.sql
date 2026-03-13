
-- Tools table
CREATE TABLE public.tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vapi_tool_id TEXT DEFAULT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  template TEXT DEFAULT NULL,
  service TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_start TEXT,
  message_complete TEXT,
  message_failed TEXT,
  service_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_agent_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  total_uses INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view tools" ON public.tools FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins/managers can create tools" ON public.tools FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can update tools" ON public.tools FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));
CREATE POLICY "Admins/managers can delete tools" ON public.tools FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

-- Tool API keys table
CREATE TABLE public.tool_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  api_key TEXT NOT NULL,
  additional_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  UNIQUE(tenant_id, service)
);

ALTER TABLE public.tool_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view api keys" ON public.tool_api_keys FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage api keys" ON public.tool_api_keys FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin');
CREATE POLICY "Admins can update api keys" ON public.tool_api_keys FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin');
CREATE POLICY "Admins can delete api keys" ON public.tool_api_keys FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin');

-- Tool activity log
CREATE TABLE public.tool_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  call_id UUID REFERENCES public.calls(id),
  status TEXT NOT NULL DEFAULT 'success',
  summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view tool activity" ON public.tool_activity_log FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Service role can insert activity" ON public.tool_activity_log FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
