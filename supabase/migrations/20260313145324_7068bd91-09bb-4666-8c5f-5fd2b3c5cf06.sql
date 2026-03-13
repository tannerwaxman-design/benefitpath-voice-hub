
-- Add credit_balance to tenants (default $10.00 starting balance)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS credit_balance numeric NOT NULL DEFAULT 10.00;

-- Create RPC to atomically deduct credits
CREATE OR REPLACE FUNCTION public.deduct_tenant_credits(p_tenant_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.tenants
  SET credit_balance = credit_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_tenant_id
  RETURNING credit_balance INTO new_balance;
  
  RETURN new_balance;
END;
$$;
