// ============================================================
// EDGE FUNCTION: billing-cycle-reset
// Called daily by pg_cron to reset billing cycles
// ============================================================

import { createAdminClient } from "../_shared/supabase-admin.ts";
import {
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const supabase = createAdminClient();

    // Find tenants whose billing cycle has ended
    const today = new Date().toISOString().split("T")[0];

    const { data: expiredTenants, error: fetchErr } = await supabase
      .from("tenants")
      .select(
        "id, company_name, minutes_used_this_cycle, monthly_minute_limit, webhook_url, webhook_events"
      )
      .lte("billing_cycle_end", today);

    if (fetchErr) {
      console.error("Error fetching expired tenants:", fetchErr);
      return errorResponse("Failed to fetch tenants: " + fetchErr.message, 500);
    }

    if (!expiredTenants || expiredTenants.length === 0) {
      return successResponse({
        message: "No billing cycles to reset",
        count: 0,
      });
    }

    let resetCount = 0;
    const newCycleEnd = new Date();
    newCycleEnd.setDate(newCycleEnd.getDate() + 30);
    const newCycleEndStr = newCycleEnd.toISOString().split("T")[0];

    for (const tenant of expiredTenants) {
      // Log the cycle summary before resetting
      await supabase.from("usage_logs").insert({
        tenant_id: tenant.id,
        event_type: "billing_cycle_reset",
        quantity: tenant.minutes_used_this_cycle,
        unit_cost: 0,
        total_cost: 0,
        billing_cycle_start: today,
        billing_cycle_end: newCycleEndStr,
      });

      // Reset the cycle
      const { error: updateErr } = await supabase
        .from("tenants")
        .update({
          minutes_used_this_cycle: 0,
          billing_cycle_start: today,
          billing_cycle_end: newCycleEndStr,
        })
        .eq("id", tenant.id);

      if (!updateErr) {
        resetCount++;
        console.log(
          `Reset billing cycle for tenant ${tenant.id} (${tenant.company_name}): ${tenant.minutes_used_this_cycle} minutes used`
        );

        // Fire webhook if configured
        if (
          tenant.webhook_url &&
          tenant.webhook_events?.includes("billing_cycle_reset")
        ) {
          fetch(tenant.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "billing_cycle_reset",
              previous_minutes_used: tenant.minutes_used_this_cycle,
              monthly_limit: tenant.monthly_minute_limit,
              new_cycle_start: today,
              new_cycle_end: newCycleEndStr,
            }),
          }).then((res) => {
            if (!res.ok) {
              console.error(`Billing cycle reset webhook returned HTTP ${res.status} for tenant ${tenant.id} (${tenant.company_name})`);
            }
          }).catch((err) => console.error(`Billing cycle reset webhook error for tenant ${tenant.id} (${tenant.company_name}):`, err));
        }
      }
    }

    return successResponse({
      message: `Reset ${resetCount} billing cycles`,
      count: resetCount,
    });
  } catch (err) {
    console.error("Billing cycle reset error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});
