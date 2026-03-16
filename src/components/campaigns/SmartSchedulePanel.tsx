import { useSmartSchedule, groupSlotsByScore } from "@/hooks/use-smart-schedule";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";

export default function SmartSchedulePanel() {
  const { data: slots, isLoading } = useSmartSchedule();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const hasData = slots && slots.length > 0;
  const groups = hasData ? groupSlotsByScore(slots) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="h-4 w-4 text-primary" />
        <span>
          Smart Schedule analyzes your past call data to find when leads are most likely to answer.
          Agents using Smart Schedule see <strong className="text-foreground">15-25% higher connect rates</strong> on average.
        </span>
      </div>

      {!hasData ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Not enough call history yet. Smart Schedule needs at least 5 calls per time slot
          to make recommendations. Data will appear after your first campaigns run.
        </div>
      ) : (
        <div className="space-y-3">
          {groups!.best.length > 0 && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="text-sm font-medium text-success mb-2">🟢 Best times (highest connect rate)</p>
              <ul className="text-sm text-foreground space-y-1">
                {groups!.best.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {groups!.good.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <p className="text-sm font-medium text-warning mb-2">🟡 Good times</p>
              <ul className="text-sm text-foreground space-y-1">
                {groups!.good.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {groups!.avoid.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive mb-2">🔴 Avoid (low connect rate)</p>
              <ul className="text-sm text-foreground space-y-1">
                {groups!.avoid.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            The AI will automatically prioritize calling during the green windows.
          </p>
        </div>
      )}
    </div>
  );
}
