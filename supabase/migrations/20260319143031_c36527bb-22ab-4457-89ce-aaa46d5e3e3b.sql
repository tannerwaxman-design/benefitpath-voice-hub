
-- Create ab_tests table
CREATE TABLE public.ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  field text NOT NULL,
  version_a_text text NOT NULL,
  version_b_text text NOT NULL,
  traffic_split integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'running',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  winner text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view ab tests" ON public.ab_tests
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins/managers can create ab tests" ON public.ab_tests
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY "Admins/managers can update ab tests" ON public.ab_tests
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY "Admins/managers can delete ab tests" ON public.ab_tests
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

-- Add ab test columns to calls
ALTER TABLE public.calls ADD COLUMN ab_test_id uuid REFERENCES public.ab_tests(id) DEFAULT NULL;
ALTER TABLE public.calls ADD COLUMN ab_test_version text DEFAULT NULL;
