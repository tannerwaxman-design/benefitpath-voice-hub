
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  icon text DEFAULT 'bell',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenant users can view notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT TO public
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_notifications_tenant_read ON public.notifications(tenant_id, read, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
