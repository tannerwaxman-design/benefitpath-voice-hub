import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am - 8pm

function getColor(rate: number): string {
  if (rate >= 0.7) return "bg-emerald-500";
  if (rate >= 0.5) return "bg-emerald-400";
  if (rate >= 0.3) return "bg-emerald-300";
  if (rate >= 0.15) return "bg-emerald-200";
  if (rate > 0) return "bg-emerald-100";
  return "bg-secondary/30";
}

export function SmartScheduleHeatmap() {
  const { user } = useAuth();

  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ["smart-schedule-heatmap", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smart_schedule")
        .select("*")
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });

  // Build heatmap grid
  const grid: Record<string, Record<number, number>> = {};
  for (const day of DAYS) {
    grid[day] = {};
    for (const hour of HOURS) {
      grid[day][hour] = 0;
    }
  }

  if (heatmapData) {
    for (const entry of heatmapData as any[]) {
      const dayIdx = entry.day_of_week; // 0=Mon, 6=Sun
      const hour = entry.hour_of_day;
      if (dayIdx >= 0 && dayIdx < 7 && hour >= 8 && hour <= 20) {
        grid[DAYS[dayIdx]][hour] = entry.connect_rate || 0;
      }
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Smart Schedule
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const hasData = heatmapData && heatmapData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Smart Schedule — Best Times to Call
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No scheduling data yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Call data will populate the optimal calling heatmap over time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="inline-grid gap-1" style={{ gridTemplateColumns: `80px repeat(${HOURS.length}, 1fr)` }}>
                {/* Header row */}
                <div />
                {HOURS.map(h => (
                  <div key={h} className="text-center text-[10px] text-muted-foreground font-medium pb-1">
                    {h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}
                  </div>
                ))}
                {/* Data rows */}
                {DAYS.map(day => (
                  <>
                    <div key={`label-${day}`} className="text-xs font-medium text-muted-foreground flex items-center pr-2">
                      {day}
                    </div>
                    {HOURS.map(hour => {
                      const rate = grid[day][hour];
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`h-8 rounded-sm ${getColor(rate)} transition-colors`}
                          title={`${day} ${hour}:00 — ${(rate * 100).toFixed(0)}% connect rate`}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Lower</span>
              <div className="flex gap-0.5">
                {["bg-secondary/30", "bg-emerald-100", "bg-emerald-200", "bg-emerald-300", "bg-emerald-400", "bg-emerald-500"].map((c, i) => (
                  <div key={i} className={`h-3 w-6 rounded-sm ${c}`} />
                ))}
              </div>
              <span>Higher connect rate</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
