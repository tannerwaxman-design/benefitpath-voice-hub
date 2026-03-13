// ============================================================
// EDGE FUNCTION: upload-document
// Handles file upload for agent knowledge base documents
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import {
  getAuthContext,
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);

    if (!["admin", "manager"].includes(auth.role)) {
      return errorResponse("Forbidden", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const agentId = formData.get("agent_id") as string | null;

    if (!file) {
      return errorResponse("No file provided");
    }

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return errorResponse("File too large (max 10MB)");
    }

    // Validate file type
    const allowedTypes = ["pdf", "docx", "txt", "csv"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedTypes.includes(ext)) {
      return errorResponse(
        `Invalid file type. Allowed: ${allowedTypes.join(", ")}`
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const serviceClient = createAdminClient();

    const storagePath = `${auth.tenantId}/${crypto.randomUUID()}_${file.name}`;

    const { error: uploadErr } = await serviceClient.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadErr) {
      return errorResponse(`Upload failed: ${uploadErr.message}`, 500);
    }

    // Create document record
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        tenant_id: auth.tenantId,
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
      return errorResponse("Failed to save document: " + docErr.message, 500);
    }

    // For text/csv files, extract text immediately
    if (ext === "txt" || ext === "csv") {
      const text = await file.text();
      await serviceClient
        .from("documents")
        .update({
          extracted_text: text.substring(0, 50000),
          processing_status: "ready",
        })
        .eq("id", doc.id);
    }

    return successResponse(doc, 201);
  } catch (err) {
    console.error("upload-document error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});
