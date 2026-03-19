// ============================================================
// EDGE FUNCTION: change-plan
//
// Updates an existing Stripe subscription to a different price
// (handles both upgrades and downgrades).
//
// If the user has no active Stripe subscription, returns
// { action: "checkout" } so the caller can fall back to the
// standard create-checkout flow.
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createAdminClient } from "../_shared/supabase-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_ORDER = [
  "voice_ai_starter",
  "voice_ai_pro",
  "voice_ai_enterprise",
  "voice_ai_custom",
];

const logStep = (step: string, details?: unknown) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[change-plan] ${step}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user?.email) throw new Error("Unauthorized");
    logStep("User authenticated", { email: user.email });

    const { priceId, planId } = await req.json();
    if (!priceId || !planId) throw new Error("priceId and planId are required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Look up Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found — fall back to checkout");
      return new Response(JSON.stringify({ action: "checkout" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    // Look up active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription — fall back to checkout");
      return new Response(JSON.stringify({ action: "checkout" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];
    const oldPriceId = subscriptionItem.price.id;
    logStep("Active subscription found", { subscriptionId: subscription.id, oldPriceId });

    // Determine upgrade vs downgrade to set proration behaviour
    // Lookup old plan by finding which STRIPE_PLANS entry has this price
    const oldPlanEntry = Object.entries({
      voice_ai_starter: "price_1TBzeiEpCunE9Xtl5wQgmFR5",
      voice_ai_pro: "price_1TBzejEpCunE9XtlPmhkEjK0",
      voice_ai_enterprise: "price_1TBzekEpCunE9Xtllayp82Cw",
    }).find(([, pid]) => pid === oldPriceId);

    const oldPlanId = oldPlanEntry?.[0] ?? "voice_ai_starter";
    const oldIdx = PLAN_ORDER.indexOf(oldPlanId);
    const newIdx = PLAN_ORDER.indexOf(planId);
    const direction = newIdx < oldIdx ? "downgrade" : "upgrade";
    logStep("Plan direction", { direction, from: oldPlanId, to: planId });

    // Update the subscription
    const updatedSub = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: subscriptionItem.id, price: priceId }],
      proration_behavior: "always_invoice",
    });
    logStep("Subscription updated", { status: updatedSub.status });

    // Persist the new plan in our DB
    const admin = createAdminClient();
    const { data: tenantUser } = await admin
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (tenantUser?.tenant_id) {
      await admin
        .from("tenants")
        .update({ plan: planId, status: "active" })
        .eq("id", tenantUser.tenant_id);
      logStep("Tenant plan updated in DB", { planId });
    }

    return new Response(
      JSON.stringify({ success: true, action: "updated", direction }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
