// ============================================================
// SHARED NOTIFICATION HELPER
// Inserts notifications into the notifications table
// ============================================================

import { createAdminClient } from "./supabase-admin.ts";

export interface NotificationPayload {
  type: "success" | "error" | "warning" | "info";
  title: string;
  body?: string;
  icon?: string;
  link?: string;
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export async function insertNotification(
  supabase: SupabaseAdmin,
  tenantId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      tenant_id: tenantId,
      type: payload.type,
      title: payload.title,
      body: payload.body || null,
      icon: payload.icon || "bell",
      link: payload.link || null,
    });
  } catch (err) {
    console.error("Failed to insert notification:", err);
  }
}
