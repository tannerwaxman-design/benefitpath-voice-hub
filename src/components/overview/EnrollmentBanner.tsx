import { getCurrentEnrollmentPeriod } from "@/lib/enrollment-periods";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function EnrollmentBanner() {
  const navigate = useNavigate();
  const period = getCurrentEnrollmentPeriod();

  if (period.type === "aep") {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-success/10 text-success">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              🟢 Annual Enrollment Period is ACTIVE
            </p>
            <p className="text-xs text-muted-foreground">
              October 15 — December 7 &nbsp;|&nbsp; <span className="text-success font-medium">{period.daysRemaining} days remaining</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your agents are automatically using AEP-optimized scripts. Maximize your campaigns now.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/campaigns/new")}>Launch AEP Campaign</Button>
      </div>
    );
  }

  if (period.type === "oep") {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              🔵 Open Enrollment Period is ACTIVE
            </p>
            <p className="text-xs text-muted-foreground">
              January 1 — March 31 &nbsp;|&nbsp; <span className="text-primary font-medium">{period.daysRemaining} days remaining</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your agents are helping enrollees review and adjust their MA plans.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/campaigns/new")}>Launch OEP Campaign</Button>
      </div>
    );
  }

  // Off-season
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-warning/10 text-warning">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            ⏳ No general enrollment period right now
          </p>
          <p className="text-xs text-muted-foreground">
            Next: AEP opens October 15 &nbsp;|&nbsp; <span className="text-warning font-medium">{period.daysRemaining} days away</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your agents are screening for Special Enrollment Periods and pre-booking AEP consultations.
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => navigate("/campaigns/new")}>Start Pre-AEP Campaign</Button>
    </div>
  );
}
