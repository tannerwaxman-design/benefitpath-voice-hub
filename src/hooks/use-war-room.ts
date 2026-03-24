import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWarRoom() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const queryClient = useQueryClient();

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const yesterdayStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const yesterdayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  // Today's calls with agent info
  const { data: todayCalls = [], isLoading } = useQuery({
    queryKey: ["war-room-today", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, agents(agent_name)")
        .gte("started_at", todayStart)
        .order("started_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  // Yesterday's calls for comparison
  const { data: yesterdayCalls = [] } = useQuery({
    queryKey: ["war-room-yesterday", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("id, outcome, detected_intent, cost_with_margin")
        .gte("started_at", yesterdayStart)
        .lt("started_at", yesterdayEnd)
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Active campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["war-room-campaigns", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, total_contacts, contacts_called, appointments_set, status")
        .in("status", ["active", "running", "in_progress", "launched"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`war-room-${tenantId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "calls",
        filter: `tenant_id=eq.${tenantId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["war-room-today", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  // Derived data
  const activeCalls = useMemo(
    () => todayCalls.filter(c => c.outcome === "in_progress"),
    [todayCalls]
  );

  const connected = useMemo(
    () => todayCalls.filter(c => ["connected", "completed"].includes(c.outcome)),
    [todayCalls]
  );

  const appointments = useMemo(
    () => todayCalls.filter(c => c.detected_intent === "schedule_appointment"),
    [todayCalls]
  );

  const dollarsSpent = useMemo(
    () => todayCalls.reduce((sum, c) => sum + (Number(c.cost_with_margin) || 0), 0),
    [todayCalls]
  );

  // Yesterday comparison
  const yTotal = yesterdayCalls.length;
  const callsChangePercent = yTotal > 0
    ? ((todayCalls.length - yTotal) / yTotal) * 100
    : 0;

  const stats = {
    totalCalls: todayCalls.length,
    connected: connected.length,
    appointments: appointments.length,
    dollarsSpent,
    connectRate: todayCalls.length > 0 ? (connected.length / todayCalls.length) * 100 : 0,
    conversionRate: todayCalls.length > 0 ? (appointments.length / todayCalls.length) * 100 : 0,
    avgCostPerAppt: appointments.length > 0 ? dollarsSpent / appointments.length : 0,
    vsYesterdayPercent: callsChangePercent,
  };

  // Agent leaderboard
  const leaderboard = useMemo(() => {
    const map = new Map<string, { name: string; calls: number; connected: number; appointments: number }>();
    todayCalls.forEach(call => {
      const agentName = (call as any).agents?.agent_name || "Unknown";
      const agentId = call.agent_id || "unknown";
      if (!map.has(agentId)) {
        map.set(agentId, { name: agentName, calls: 0, connected: 0, appointments: 0 });
      }
      const e = map.get(agentId)!;
      e.calls++;
      if (["connected", "completed"].includes(call.outcome)) e.connected++;
      if (call.detected_intent === "schedule_appointment") e.appointments++;
    });
    return Array.from(map.entries())
      .map(([id, d]) => ({
        agentId: id,
        ...d,
        rate: d.calls > 0 ? (d.appointments / d.calls) * 100 : 0,
      }))
      .sort((a, b) => b.appointments - a.appointments || b.connected - a.connected);
  }, [todayCalls]);

  // Appointment feed
  const appointmentFeed = useMemo(() => {
    return todayCalls
      .filter(c => c.detected_intent === "schedule_appointment")
      .slice(0, 20)
      .map(c => ({
        id: c.id,
        time: c.started_at,
        contactName: c.contact_name || "Unknown",
        agentName: (c as any).agents?.agent_name || "Unknown",
      }));
  }, [todayCalls]);

  // Hourly breakdown
  const hourlyBreakdown = useMemo(() => {
    const hours: { hour: number; calls: number; appointments: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourCalls = todayCalls.filter(c => new Date(c.started_at).getHours() === h);
      if (hourCalls.length > 0) {
        hours.push({
          hour: h,
          calls: hourCalls.length,
          appointments: hourCalls.filter(c => c.detected_intent === "schedule_appointment").length,
        });
      }
    }
    return hours;
  }, [todayCalls]);

  return {
    stats,
    activeCalls,
    leaderboard,
    appointmentFeed,
    hourlyBreakdown,
    campaigns,
    hasActiveCalls: activeCalls.length > 0,
    isLoading,
  };
}
