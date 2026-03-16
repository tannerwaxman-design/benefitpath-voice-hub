
DROP FUNCTION IF EXISTS public.get_agent_performance(timestamp with time zone, timestamp with time zone);

CREATE FUNCTION public.get_agent_performance(date_from timestamp with time zone, date_to timestamp with time zone)
 RETURNS TABLE(agent_id uuid, agent_name text, total_calls bigint, connect_rate numeric, avg_duration numeric, appointments bigint, positive_sentiment_pct numeric, avg_score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id as agent_id, a.agent_name,
    COUNT(c.id) as total_calls,
    ROUND(100.0 * COUNT(*) FILTER (WHERE c.outcome IN ('connected', 'completed')) / NULLIF(COUNT(c.id), 0), 1) as connect_rate,
    ROUND(AVG(c.duration_seconds)::numeric) as avg_duration,
    COUNT(*) FILTER (WHERE c.detected_intent = 'schedule_appointment') as appointments,
    ROUND(100.0 * COUNT(*) FILTER (WHERE c.sentiment = 'positive') / NULLIF(COUNT(*) FILTER (WHERE c.sentiment IS NOT NULL), 0), 1) as positive_sentiment_pct,
    ROUND(AVG(c.quality_score)::numeric, 1) as avg_score
  FROM agents a
  LEFT JOIN calls c ON c.agent_id = a.id AND c.started_at >= date_from AND c.started_at <= date_to
  WHERE a.tenant_id = get_user_tenant_id() AND a.status = 'active'
  GROUP BY a.id, a.agent_name;
$function$;
