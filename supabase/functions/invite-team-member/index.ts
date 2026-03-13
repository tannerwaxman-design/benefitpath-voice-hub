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

    if (auth.role !== "admin") {
      return errorResponse("Only admins can invite team members", 403);
    }

    const body = await req.json();
    const { action } = body;

    const adminClient = createAdminClient();

    // === LIST MEMBERS (with emails) ===
    if (action === "list") {
      const { data: members } = await adminClient
        .from("tenant_users")
        .select("id, user_id, role, status, created_at, invited_at, accepted_at")
        .eq("tenant_id", auth.tenantId)
        .order("created_at", { ascending: true });

      if (!members) return successResponse({ members: [] });

      // Look up emails from auth.users for each member
      const enriched = await Promise.all(
        members.map(async (m) => {
          const { data: { user } } = await adminClient.auth.admin.getUserById(m.user_id);
          return {
            ...m,
            email: user?.email || "Unknown",
          };
        })
      );

      return successResponse({ members: enriched });
    }

    // === INVITE ===
    if (action === "invite") {
      const { email, role } = body;

      if (!email || !role) {
        return errorResponse("Email and role are required");
      }

      if (!["admin", "manager", "viewer"].includes(role)) {
        return errorResponse("Invalid role. Must be admin, manager, or viewer");
      }

      // Check if user already exists in auth
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existingUser = users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
        // Check if already a member
        const { data: existingMember } = await adminClient
          .from("tenant_users")
          .select("id, status")
          .eq("tenant_id", auth.tenantId)
          .eq("user_id", existingUser.id)
          .maybeSingle();

        if (existingMember) {
          if (existingMember.status === "active") {
            return errorResponse("This user is already a team member");
          }
          // Re-activate if previously removed
          await adminClient
            .from("tenant_users")
            .update({ status: "invited", role, invited_at: new Date().toISOString(), invited_by: auth.userId })
            .eq("id", existingMember.id);

          return successResponse({ message: "Invitation sent", status: "re_invited" });
        }

        // Add existing user to tenant
        const { error } = await adminClient
          .from("tenant_users")
          .insert({
            tenant_id: auth.tenantId,
            user_id: existingUser.id,
            role,
            status: "invited",
            invited_at: new Date().toISOString(),
            invited_by: auth.userId,
          });

        if (error) return errorResponse("Failed to invite: " + error.message);

        return successResponse({ message: "Invitation sent", status: "invited_existing" });
      }

      // User doesn't exist — create an invite via Supabase Auth invite
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { invited_to_tenant: auth.tenantId, role },
      });

      if (inviteError) {
        return errorResponse("Failed to send invite: " + inviteError.message);
      }

      // The handle_new_user trigger will create a separate tenant for them.
      // We need to also add them to THIS tenant as invited.
      if (inviteData?.user) {
        await adminClient.from("tenant_users").insert({
          tenant_id: auth.tenantId,
          user_id: inviteData.user.id,
          role,
          status: "invited",
          invited_at: new Date().toISOString(),
          invited_by: auth.userId,
        });
      }

      return successResponse({ message: "Invitation email sent", status: "invited_new" });
    }

    // === REMOVE MEMBER ===
    if (action === "remove") {
      const { member_id } = body;
      if (!member_id) return errorResponse("member_id is required");

      // Can't remove yourself
      const { data: member } = await adminClient
        .from("tenant_users")
        .select("user_id")
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId)
        .single();

      if (!member) return errorResponse("Member not found", 404);
      if (member.user_id === auth.userId) return errorResponse("You cannot remove yourself");

      await adminClient
        .from("tenant_users")
        .delete()
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId);

      return successResponse({ message: "Member removed" });
    }

    // === UPDATE ROLE ===
    if (action === "update_role") {
      const { member_id, role } = body;
      if (!member_id || !role) return errorResponse("member_id and role are required");
      if (!["admin", "manager", "viewer"].includes(role)) return errorResponse("Invalid role");

      const { data: member } = await adminClient
        .from("tenant_users")
        .select("user_id")
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId)
        .single();

      if (!member) return errorResponse("Member not found", 404);
      if (member.user_id === auth.userId) return errorResponse("You cannot change your own role");

      await adminClient
        .from("tenant_users")
        .update({ role })
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId);

      return successResponse({ message: "Role updated" });
    }

    return errorResponse("Invalid action");
  } catch (err) {
    console.error("invite-team-member error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});
