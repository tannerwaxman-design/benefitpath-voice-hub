
-- Coaching notes for calls
CREATE TABLE public.call_coaching_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  author_email text NOT NULL DEFAULT '',
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_coaching_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view coaching notes" ON public.call_coaching_notes
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins/managers can create coaching notes" ON public.call_coaching_notes
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "Admins can delete coaching notes" ON public.call_coaching_notes
  FOR DELETE TO authenticated USING (
    tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin'
  );

-- Transcript inline comments
CREATE TABLE public.call_transcript_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  author_email text NOT NULL DEFAULT '',
  message_index integer NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_transcript_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view transcript comments" ON public.call_transcript_comments
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins/managers can create transcript comments" ON public.call_transcript_comments
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = get_user_tenant_id() AND get_user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "Admins can delete transcript comments" ON public.call_transcript_comments
  FOR DELETE TO authenticated USING (
    tenant_id = get_user_tenant_id() AND get_user_tenant_role() = 'admin'
  );

-- Add review_status to calls table
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'not_reviewed';
