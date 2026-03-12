CREATE OR REPLACE FUNCTION public.increment_tenant_minutes(
  p_tenant_id UUID,
  p_minutes DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE public.tenants
  SET minutes_used_this_cycle = minutes_used_this_cycle + p_minutes,
      updated_at = NOW()
  WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;