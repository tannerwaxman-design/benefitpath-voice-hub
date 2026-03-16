import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SmartScheduleSlot {
  day_of_week: number;
  hour_of_day: number;
  total_calls: number;
  total_connected: number;
  connect_rate: number;
  score: "best" | "good" | "average" | "avoid";
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function useSmartSchedule() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["smart-schedule", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_smart_schedule");
      if (error) throw error;
      return (data || []) as SmartScheduleSlot[];
    },
    enabled: !!user?.tenant_id,
    staleTime: 10 * 60 * 1000,
  });
}

export function formatSlotTime(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

export function groupSlotsByScore(slots: SmartScheduleSlot[]) {
  const best: string[] = [];
  const good: string[] = [];
  const avoid: string[] = [];

  // Group consecutive hours per day
  const byDay = new Map<number, SmartScheduleSlot[]>();
  for (const s of slots) {
    if (!byDay.has(s.day_of_week)) byDay.set(s.day_of_week, []);
    byDay.get(s.day_of_week)!.push(s);
  }

  for (const [day, daySlots] of byDay) {
    const dayName = DAY_NAMES[day];
    const scoreGroups = { best: [] as number[], good: [] as number[], avoid: [] as number[] };
    for (const s of daySlots) {
      if (s.score === "best") scoreGroups.best.push(s.hour_of_day);
      else if (s.score === "good") scoreGroups.good.push(s.hour_of_day);
      else if (s.score === "avoid") scoreGroups.avoid.push(s.hour_of_day);
    }

    for (const [score, hours] of Object.entries(scoreGroups)) {
      if (hours.length === 0) continue;
      hours.sort((a, b) => a - b);
      const ranges = compressHours(hours);
      const target = score === "best" ? best : score === "good" ? good : avoid;
      for (const r of ranges) {
        target.push(`${dayName} ${r}`);
      }
    }
  }

  return { best, good, avoid };
}

function compressHours(hours: number[]): string[] {
  const ranges: string[] = [];
  let start = hours[0];
  let end = hours[0];
  for (let i = 1; i < hours.length; i++) {
    if (hours[i] === end + 1) {
      end = hours[i];
    } else {
      ranges.push(`${formatSlotTime(start)} - ${formatSlotTime(end + 1)}`);
      start = hours[i];
      end = hours[i];
    }
  }
  ranges.push(`${formatSlotTime(start)} - ${formatSlotTime(end + 1)}`);
  return ranges;
}

export { DAY_NAMES };
