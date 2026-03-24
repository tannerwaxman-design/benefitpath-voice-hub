import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  corsHeaders,
  getAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return successResponse({ purchases: [], invoices: [] });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createAdminClient();

    // Get stripe_customer_id from tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", auth.tenantId)
      .single();

    if (!tenant?.stripe_customer_id) {
      return successResponse({ purchases: [], invoices: [] });
    }

    const customerId = tenant.stripe_customer_id;

    // Fetch credit purchase history (PaymentIntents with metadata type=credit_purchase)
    const [paymentIntents, invoices] = await Promise.all([
      stripe.paymentIntents.list({
        customer: customerId,
        limit: 50,
      }),
      stripe.invoices.list({
        customer: customerId,
        limit: 50,
      }),
    ]);

    const purchases = paymentIntents.data
      .filter((pi) => pi.status === "succeeded")
      .map((pi) => ({
        id: pi.id,
        amount: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
        description: pi.description ?? pi.metadata?.package ?? "Credit Purchase",
        date: new Date(pi.created * 1000).toISOString(),
        status: "succeeded",
      }));

    const invoiceList = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount: (inv.amount_paid ?? inv.amount_due) / 100,
      currency: inv.currency.toUpperCase(),
      description: inv.lines?.data?.[0]?.description ?? "Subscription",
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      status: inv.status,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
    }));

    return successResponse({ purchases, invoices: invoiceList });
  } catch (err) {
    console.error("get-billing-history error:", err);
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return errorResponse(err.message, 401);
    }
    return errorResponse(
      err instanceof Error ? err.message : "Failed to fetch billing history",
      500
    );
  }
});
