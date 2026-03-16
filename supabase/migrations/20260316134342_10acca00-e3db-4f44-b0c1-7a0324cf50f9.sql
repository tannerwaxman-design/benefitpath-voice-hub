
-- Add post-call action config columns to agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS post_call_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_call_email_subject text DEFAULT 'Thanks for chatting with us!',
  ADD COLUMN IF NOT EXISTS post_call_email_body text DEFAULT '',
  ADD COLUMN IF NOT EXISTS post_call_email_trigger text NOT NULL DEFAULT 'connected_only',
  ADD COLUMN IF NOT EXISTS post_call_sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_call_sms_body text DEFAULT '',
  ADD COLUMN IF NOT EXISTS post_call_notification_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_call_notification_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS post_call_notification_triggers jsonb NOT NULL DEFAULT '["appointment_booked","lead_qualified","callback_requested"]'::jsonb,
  ADD COLUMN IF NOT EXISTS post_call_notification_includes jsonb NOT NULL DEFAULT '["call_summary","contact_info"]'::jsonb,
  ADD COLUMN IF NOT EXISTS post_call_task_enabled boolean NOT NULL DEFAULT false;

-- Create post_call_tasks table
CREATE TABLE public.post_call_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  call_id uuid REFERENCES public.calls(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  generated_by text NOT NULL DEFAULT 'ai',
  contact_name text,
  call_date timestamp with time zone,
  completed_by text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_call_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view tasks" ON public.post_call_tasks
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins/managers can create tasks" ON public.post_call_tasks
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY "Admins/managers can update tasks" ON public.post_call_tasks
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete tasks" ON public.post_call_tasks
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin');
