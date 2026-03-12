import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY")!;
const VAPI_BASE_URL = "https://api.vapi.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { number_type, area_code, friendly_name } = body;

    // Get tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!tenantUser || tenantUser.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    // Request number from VAPI
    const vapiPayload: any = {
      provider: "twilio",
      numberDesiredAreaCode: area_code || undefined,
    };

    if (number_type === "toll_free") {
      vapiPayload.numberType = "toll-free";
    }

    const vapiRes = await fetch(`${VAPI_BASE_URL}/phone-number`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vapiPayload),
    });

    if (!vapiRes.ok) {
      const errText = await vapiRes.text();
      return new Response(JSON.stringify({ error: "Failed to provision number", details: errText }), {
        status: 502, headers: corsHeaders,
      });
    }

    const vapiNumber = await vapiRes.json();

    // Save to our DB
    const { data: phoneRecord, error: insertErr } = await supabase
      .from("phone_numbers")
      .insert({
        tenant_id: tenantUser.tenant_id,
        vapi_phone_id: vapiNumber.id,
        phone_number: vapiNumber.number || vapiNumber.phoneNumber,
        friendly_name: friendly_name || null,
        area_code: area_code || null,
        number_type: number_type || "local",
        status: "active",
        monthly_cost: number_type === "toll_free" ? 3.00 : 1.50,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify(phoneRecord), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
