
-- Credit transactions log
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase','usage','refund','bonus','auto_refill')),
  credits_added integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0.00,
  stripe_payment_id text,
  package_name text,
  call_id uuid REFERENCES public.calls(id),
  balance_after integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_tenant ON public.credit_transactions(tenant_id);
CREATE INDEX idx_credit_tx_type ON public.credit_transactions(tenant_id, type);
CREATE INDEX idx_credit_tx_date ON public.credit_transactions(tenant_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view credit transactions"
  ON public.credit_transactions FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can insert credit transactions"
  ON public.credit_transactions FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role'::text);

-- Add auto-refill columns to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS auto_refill_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_refill_threshold integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS auto_refill_package text NOT NULL DEFAULT '1000';
