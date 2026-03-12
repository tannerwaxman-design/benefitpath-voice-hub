
-- Analytics RPC: Calls per day
CREATE OR REPLACE FUNCTION public.get_calls_per_day(date_from timestamptz, date_to timestamptz)
RETURNS TABLE(day date, total_calls bigint, connected bigint, voicemail bigint, no_answer bigint, failed bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DATE(started_at) as day,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) as connected,
    COUNT(*) FILTER (WHERE outcome = 'voicemail') as voicemail,
    COUNT(*) FILTER (WHERE outcome = 'no_answer') as no_answer,
    COUNT(*) FILTER (WHERE outcome = 'failed') as failed
  FROM calls
  WHERE tenant_id = get_user_tenant_id()
    AND started_at >= date_from
    AND started_at <= date_to
  GROUP BY DATE(started_at)
  ORDER BY day;
$$;

-- Analytics RPC: Agent performance
CREATE OR REPLACE FUNCTION public.get_agent_performance(date_from timestamptz, date_to timestamptz)
RETURNS TABLE(agent_id uuid, agent_name text, total_calls bigint, connect_rate numeric, avg_duration numeric, appointments bigint, positive_sentiment_pct numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id as agent_id, a.agent_name,
    COUNT(c.id) as total_calls,
    ROUND(100.0 * COUNT(*) FILTER (WHERE c.outcome IN ('connected', 'completed')) / NULLIF(COUNT(c.id), 0), 1) as connect_rate,
    ROUND(AVG(c.duration_seconds)::numeric) as avg_duration,
    COUNT(*) FILTER (WHERE c.detected_intent = 'schedule_appointment') as appointments,
    ROUND(100.0 * COUNT(*) FILTER (WHERE c.sentiment = 'positive') / NULLIF(COUNT(*) FILTER (WHERE c.sentiment IS NOT NULL), 0), 1) as positive_sentiment_pct
  FROM agents a
  LEFT JOIN calls c ON c.agent_id = a.id AND c.started_at >= date_from AND c.started_at <= date_to
  WHERE a.tenant_id = get_user_tenant_id() AND a.status = 'active'
  GROUP BY a.id, a.agent_name;
$$;

-- Analytics RPC: Best calling hours heatmap
CREATE OR REPLACE FUNCTION public.get_calling_heatmap(date_from timestamptz, date_to timestamptz)
RETURNS TABLE(day_of_week double precision, hour double precision, total_calls bigint, connect_rate numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXTRACT(DOW FROM started_at) as day_of_week,
    EXTRACT(HOUR FROM started_at) as hour,
    COUNT(*) as total_calls,
    ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) / NULLIF(COUNT(*), 0), 1) as connect_rate
  FROM calls
  WHERE tenant_id = get_user_tenant_id()
    AND started_at >= date_from
    AND started_at <= date_to
  GROUP BY day_of_week, hour;
$$;

-- Analytics RPC: Conversion funnel
CREATE OR REPLACE FUNCTION public.get_conversion_funnel(date_from timestamptz, date_to timestamptz)
RETURNS TABLE(total_calls bigint, connected bigint, engaged bigint, qualified bigint, appointments bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) as connected,
    COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed') AND duration_seconds > 60) as engaged,
    COUNT(*) FILTER (WHERE detected_intent IS NOT NULL) as qualified,
    COUNT(*) FILTER (WHERE detected_intent = 'schedule_appointment') as appointments
  FROM calls
  WHERE tenant_id = get_user_tenant_id()
    AND started_at >= date_from
    AND started_at <= date_to;
$$;

-- Analytics RPC: Summary KPIs
CREATE OR REPLACE FUNCTION public.get_analytics_summary(date_from timestamptz, date_to timestamptz)
RETURNS TABLE(total_calls bigint, connect_rate numeric, avg_duration_seconds numeric, appointments_set bigint, conversion_rate numeric, minutes_used numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) as total_calls,
    ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IN ('connected', 'completed')) / NULLIF(COUNT(*), 0), 1) as connect_rate,
    ROUND(AVG(duration_seconds)::numeric) as avg_duration_seconds,
    COUNT(*) FILTER (WHERE detected_intent = 'schedule_appointment') as appointments_set,
    ROUND(100.0 * COUNT(*) FILTER (WHERE detected_intent = 'schedule_appointment') / NULLIF(COUNT(*), 0), 1) as conversion_rate,
    ROUND(COALESCE(SUM(cost_minutes), 0)::numeric, 1) as minutes_used
  FROM calls
  WHERE tenant_id = get_user_tenant_id()
    AND started_at >= date_from
    AND started_at <= date_to;
$$;

-- Increment campaign contact attempts helper
CREATE OR REPLACE FUNCTION public.increment_campaign_contact_attempts(cc_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE campaign_contacts
  SET total_attempts = total_attempts + 1
  WHERE id = cc_id;
END;
$$;
