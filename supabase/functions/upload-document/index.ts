import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!tenantUser || !["admin", "manager"].includes(tenantUser.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const agentId = formData.get("agent_id") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: corsHeaders });
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: "File too large (max 10MB)" }), { status: 400, headers: corsHeaders });
    }

    const allowedTypes = ["pdf", "docx", "txt", "csv"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedTypes.includes(ext)) {
      return new Response(JSON.stringify({ error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}` }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Upload to Supabase Storage using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const storagePath = `${tenantUser.tenant_id}/${crypto.randomUUID()}_${file.name}`;

    const { error: uploadErr } = await serviceClient.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }), {
        status: 500, headers: corsHeaders,
      });
    }

    // Create document record
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        tenant_id: tenantUser.tenant_id,
        agent_id: agentId || null,
        filename: file.name,
        file_type: ext,
        file_size_bytes: file.size,
        storage_path: storagePath,
        processing_status: "pending",
      })
      .select()
      .single();

    if (docErr) {
      return new Response(JSON.stringify({ error: docErr.message }), { status: 400, headers: corsHeaders });
    }

    // For text/csv files, extract text immediately
    if (ext === "txt" || ext === "csv") {
      const text = await file.text();
      await serviceClient.from("documents").update({
        extracted_text: text.substring(0, 50000), // Cap at 50K chars
        processing_status: "ready",
      }).eq("id", doc.id);
    }
    // For PDF/DOCX, mark as processing (would need a separate processing pipeline)

    return new Response(JSON.stringify(doc), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
