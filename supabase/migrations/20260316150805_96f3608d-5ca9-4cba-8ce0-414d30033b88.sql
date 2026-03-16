
-- Smart schedule table: stores connect rate per tenant per day/hour
CREATE TABLE public.smart_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_of_day smallint NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  total_calls integer NOT NULL DEFAULT 0,
  total_connected integer NOT NULL DEFAULT 0,
  connect_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  score text NOT NULL DEFAULT 'average' CHECK (score IN ('best', 'good', 'average', 'avoid')),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, day_of_week, hour_of_day)
);

ALTER TABLE public.smart_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view smart schedule"
  ON public.smart_schedule FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can manage smart schedule"
  ON public.smart_schedule FOR ALL TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Add smart_schedule_enabled to campaigns
ALTER TABLE public.campaigns ADD COLUMN smart_schedule_enabled boolean NOT NULL DEFAULT false;

-- RPC to recalculate smart schedule for a tenant
CREATE OR REPLACE FUNCTION public.recalculate_smart_schedule(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM smart_schedule WHERE tenant_id = p_tenant_id;

  INSERT INTO smart_schedule (tenant_id, day_of_week, hour_of_day, total_calls, total_connected, connect_rate, score)
  SELECT
    p_tenant_id,
    EXTRACT(DOW FROM started_at)::smallint,
    EXTRACT(HOUR FROM started_at)::smallint,
    COUNT(*),
    COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')),
    ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) / NULLIF(COUNT(*), 0), 2),
    CASE
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) / NULLIF(COUNT(*), 0), 2) >= 40 THEN 'best'
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) / NULLIF(COUNT(*), 0), 2) >= 25 THEN 'good'
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) / NULLIF(COUNT(*), 0), 2) >= 10 THEN 'average'
      ELSE 'avoid'
    END
  FROM calls
  WHERE tenant_id = p_tenant_id
    AND started_at >= NOW() - INTERVAL '90 days'
  GROUP BY EXTRACT(DOW FROM started_at), EXTRACT(HOUR FROM started_at)
  HAVING COUNT(*) >= 5;
END;
$$;

-- RPC to get smart schedule for current user's tenant
CREATE OR REPLACE FUNCTION public.get_smart_schedule()
RETURNS TABLE(day_of_week smallint, hour_of_day smallint, total_calls integer, total_connected integer, connect_rate numeric, score text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT day_of_week, hour_of_day, total_calls, total_connected, connect_rate, score
  FROM smart_schedule
  WHERE tenant_id = get_user_tenant_id()
  ORDER BY day_of_week, hour_of_day;
$$;
