import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Called daily by pg_cron to reset billing cycles
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find tenants whose billing cycle has ended
    const today = new Date().toISOString().split("T")[0];

    const { data: expiredTenants, error: fetchErr } = await supabase
      .from("tenants")
      .select("id, company_name, minutes_used_this_cycle, monthly_minute_limit")
      .lte("billing_cycle_end", today);

    if (fetchErr) {
      console.error("Error fetching expired tenants:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
    }

    if (!expiredTenants || expiredTenants.length === 0) {
      return new Response(JSON.stringify({ message: "No billing cycles to reset", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        console.log(`Reset billing cycle for tenant ${tenant.id} (${tenant.company_name}): ${tenant.minutes_used_this_cycle} minutes used`);

        // Fire webhook if configured
        const { data: tenantFull } = await supabase
          .from("tenants")
          .select("webhook_url, webhook_events")
          .eq("id", tenant.id)
          .single();

        if (tenantFull?.webhook_url && tenantFull.webhook_events?.includes("billing_cycle_reset")) {
          fetch(tenantFull.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "billing_cycle_reset",
              previous_minutes_used: tenant.minutes_used_this_cycle,
              monthly_limit: tenant.monthly_minute_limit,
              new_cycle_start: today,
              new_cycle_end: newCycleEndStr,
            }),
          }).catch(() => {});
        }
      }
    }

    return new Response(JSON.stringify({ message: `Reset ${resetCount} billing cycles`, count: resetCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Billing cycle reset error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
