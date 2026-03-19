import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getCurrentEnrollmentPeriod, getUpcomingPeriod, ENROLLMENT_CALENDAR } from "@/lib/enrollment-periods";
import { Calendar, Clock } from "lucide-react";
import { useState } from "react";

export function EnrollmentPeriodsSection() {
  const current = getCurrentEnrollmentPeriod();
  const upcoming = getUpcomingPeriod();
  const [autoAdjust, setAutoAdjust] = useState(true);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="section-title">Enrollment Periods</CardTitle>
          <p className="text-sm text-muted-foreground">
            BenefitPath tracks Medicare enrollment periods automatically and adjusts your AI agent's scripts based on what's active.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current period */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30">
            <div className={`p-2.5 rounded-full shrink-0 ${current.isActive ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">Current Period:</span>
                <Badge variant={current.isActive ? "default" : "secondary"} className={current.isActive ? "bg-success/10 text-success border-0 text-[10px]" : "bg-warning/10 text-warning border-0 text-[10px]"}>
                  {current.isActive ? "🟢 Active" : "⏳ Off-Season"}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground mt-1">{current.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{current.description}</p>
              {current.isActive && (
                <p className="text-xs text-primary font-medium mt-1">{current.daysRemaining} days remaining</p>
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
            <div className="p-2.5 rounded-full shrink-0 bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">Upcoming:</span>
              <p className="text-sm text-foreground mt-0.5">{upcoming.label}</p>
              <p className="text-xs text-muted-foreground">{upcoming.dates}</p>
              <p className="text-xs text-primary font-medium mt-0.5">{upcoming.daysAway} days away</p>
            </div>
          </div>

          {/* Calendar reference */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-secondary/30 border-b">
              <p className="text-sm font-semibold text-foreground">Key Medicare Dates — {new Date().getFullYear()}</p>
            </div>
            <div className="divide-y divide-border">
              {ENROLLMENT_CALENDAR.map((entry) => (
                <div key={entry.label} className="px-4 py-3 flex items-start gap-4">
                  <span className="text-xs font-mono text-muted-foreground w-32 shrink-0 pt-0.5">{entry.dates}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.label}</p>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-adjust toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <Label className="text-sm font-medium">Auto-adjust scripts based on enrollment period</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI automatically updates urgency and messaging based on the current period
              </p>
            </div>
            <Switch checked={autoAdjust} onCheckedChange={setAutoAdjust} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
