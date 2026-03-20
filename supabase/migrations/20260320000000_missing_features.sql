-- ============================================================
-- Missing Features Migration
-- Adds: recording_retention_days on tenants, tenant-logos
--       storage bucket, crm_connections table
-- ============================================================

-- 1. Recording retention policy column on tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS recording_retention_days INTEGER NOT NULL DEFAULT 90;

-- 2. Public storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public)
  VALUES ('tenant-logos', 'tenant-logos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant users can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "Tenant users can upload their logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

CREATE POLICY "Tenant users can update their logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

CREATE POLICY "Tenant users can delete their logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

-- 3. CRM / Calendar OAuth connections table
CREATE TABLE IF NOT EXISTS public.crm_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'salesforce', 'hubspot', 'zoho_crm',
    'google_calendar', 'outlook_calendar', 'calendly'
  )),
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_name TEXT,
  account_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_connections_tenant_provider_unique UNIQUE (tenant_id, provider)
);

CREATE INDEX idx_crm_connections_tenant ON public.crm_connections(tenant_id);

ALTER TABLE public.crm_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their CRM connections"
  ON public.crm_connections FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can manage CRM connections"
  ON public.crm_connections FOR ALL
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tenant_users
      WHERE tenant_users.user_id = auth.uid()
        AND tenant_users.tenant_id = crm_connections.tenant_id
        AND tenant_users.role IN ('admin', 'manager')
    )
  );
