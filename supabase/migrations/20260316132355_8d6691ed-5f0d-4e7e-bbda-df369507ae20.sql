
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_info text DEFAULT '',
  faq_pairs jsonb NOT NULL DEFAULT '[]'::jsonb,
  website_url text,
  website_content text,
  website_imported_at timestamptz,
  assigned_agent_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view knowledge base"
  ON public.knowledge_base FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins/managers can insert knowledge base"
  ON public.knowledge_base FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY "Admins/managers can update knowledge base"
  ON public.knowledge_base FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY "Admins/managers can delete knowledge base"
  ON public.knowledge_base FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));
