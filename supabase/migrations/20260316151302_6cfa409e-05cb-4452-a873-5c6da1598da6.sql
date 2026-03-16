
CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'test_agent' CHECK (mode IN ('practice_yourself', 'test_agent')),
  scenario text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  score integer,
  score_breakdown jsonb,
  feedback jsonb,
  transcript jsonb,
  duration_seconds integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view training sessions"
  ON public.training_sessions FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authenticated users can create training sessions"
  ON public.training_sessions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Authenticated users can update their training sessions"
  ON public.training_sessions FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());
