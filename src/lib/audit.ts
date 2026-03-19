import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  tenant_id: string;
  user_id?: string | null;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  entity_name?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Write an audit log entry. Fire-and-forget — never throws, never blocks.
 * Audit failures must not disrupt the user flow.
 */
export function logAudit(entry: AuditEntry): void {
  supabase
    .from("audit_logs" as never)
    .insert(entry)
    .then(({ error }) => {
      if (error) console.warn("[audit] insert failed:", error.message);
    });
}
