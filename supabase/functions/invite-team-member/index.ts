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
    const body = await req.json();
    const { action } = body;
    const adminClient = createAdminClient();

    // === LIST MEMBERS (with emails) ===
    if (action === "list") {
      // Any authenticated tenant member can list
      const { data: members } = await adminClient
        .from("tenant_users")
        .select("id, user_id, role, status, created_at, invited_at, accepted_at, invited_by")
        .eq("tenant_id", auth.tenantId)
        .order("created_at", { ascending: true });

      if (!members) return successResponse({ members: [] });

      // Get tenant owner info
      const { data: tenant } = await adminClient
        .from("tenants")
        .select("owner_user_id")
        .eq("id", auth.tenantId)
        .single();

      const ownerUserId = tenant?.owner_user_id;

      const enriched = await Promise.all(
        members.map(async (m) => {
          const { data: { user } } = await adminClient.auth.admin.getUserById(m.user_id);
          const isOwner = m.user_id === ownerUserId;
          return {
            ...m,
            email: user?.email || "Unknown",
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
            // Override role display for the owner
            role: isOwner ? "owner" : m.role,
          };
        })
      );

      return successResponse({ members: enriched });
    }

    // === INVITE ===
    if (action === "invite") {
      if (!["admin", "owner"].includes(auth.role) && auth.userId !== (await adminClient.from("tenants").select("owner_user_id").eq("id", auth.tenantId).single()).data?.owner_user_id) {
        // Check if user is the tenant owner (whose role might be stored as 'admin')
        const { data: tenantData } = await adminClient.from("tenants").select("owner_user_id").eq("id", auth.tenantId).single();
        if (auth.userId !== tenantData?.owner_user_id && auth.role !== "admin") {
          return errorResponse("Only admins can invite team members", 403);
        }
      }

      const { email, role } = body;
      if (!email || !role) return errorResponse("Email and role are required");
      if (!["admin", "manager", "viewer"].includes(role)) return errorResponse("Invalid role. Must be admin, manager, or viewer");

      // Check plan team limit
      const { data: currentMembers } = await adminClient
        .from("tenant_users")
        .select("id")
        .eq("tenant_id", auth.tenantId)
        .in("status", ["active", "invited"]);

      const { data: tenantInfo } = await adminClient
        .from("tenants")
        .select("plan")
        .eq("id", auth.tenantId)
        .single();

      const plan = tenantInfo?.plan || "voice_ai_starter";
      const limits: Record<string, number> = {
        voice_ai_starter: 1,
        voice_ai_pro: 3,
        voice_ai_enterprise: 10,
      };
      const limit = limits[plan] ?? 1;
      const currentCount = currentMembers?.length ?? 0;

      if (currentCount >= limit) {
        return errorResponse(`Your plan allows ${limit} team member${limit > 1 ? "s" : ""}. Upgrade to add more.`, 403);
      }

      // Check if user already exists in auth
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existingUser = users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
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
          await adminClient
            .from("tenant_users")
            .update({ status: "invited", role, invited_at: new Date().toISOString(), invited_by: auth.userId })
            .eq("id", existingMember.id);
          return successResponse({ message: "Invitation sent", status: "re_invited" });
        }

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

      // User doesn't exist — create via Supabase Auth invite
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { invited_to_tenant: auth.tenantId, role },
      });

      if (inviteError) return errorResponse("Failed to send invite: " + inviteError.message);

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
      if (!["admin"].includes(auth.role)) {
        const { data: t } = await adminClient.from("tenants").select("owner_user_id").eq("id", auth.tenantId).single();
        if (auth.userId !== t?.owner_user_id) return errorResponse("Only admins can remove team members", 403);
      }

      const { member_id } = body;
      if (!member_id) return errorResponse("member_id is required");

      const { data: member } = await adminClient
        .from("tenant_users")
        .select("user_id, role")
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId)
        .single();

      if (!member) return errorResponse("Member not found", 404);
      if (member.user_id === auth.userId) return errorResponse("You cannot remove yourself");

      // Check if target is the owner
      const { data: tenant } = await adminClient.from("tenants").select("owner_user_id").eq("id", auth.tenantId).single();
      if (member.user_id === tenant?.owner_user_id) return errorResponse("Cannot remove the account owner");

      // Admins can't remove other admins (only owner can)
      if (auth.userId !== tenant?.owner_user_id && member.role === "admin") {
        return errorResponse("Only the owner can remove admins");
      }

      await adminClient
        .from("tenant_users")
        .delete()
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId);

      return successResponse({ message: "Member removed" });
    }

    // === UPDATE ROLE ===
    if (action === "update_role") {
      if (!["admin"].includes(auth.role)) {
        const { data: t } = await adminClient.from("tenants").select("owner_user_id").eq("id", auth.tenantId).single();
        if (auth.userId !== t?.owner_user_id) return errorResponse("Only admins can change roles", 403);
      }

      const { member_id, role } = body;
      if (!member_id || !role) return errorResponse("member_id and role are required");
      if (!["admin", "manager", "viewer"].includes(role)) return errorResponse("Invalid role");

      const { data: member } = await adminClient
        .from("tenant_users")
        .select("user_id, role")
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId)
        .single();

      if (!member) return errorResponse("Member not found", 404);
      if (member.user_id === auth.userId) return errorResponse("You cannot change your own role");

      // Check if target is owner
      const { data: tenant } = await adminClient.from("tenants").select("owner_user_id").eq("id", auth.tenantId).single();
      if (member.user_id === tenant?.owner_user_id) return errorResponse("Cannot change the owner's role");

      // Admin can't change other admin's role
      if (auth.userId !== tenant?.owner_user_id && member.role === "admin") {
        return errorResponse("Only the owner can change admin roles");
      }

      await adminClient
        .from("tenant_users")
        .update({ role })
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId);

      return successResponse({ message: "Role updated" });
    }

    // === TRANSFER OWNERSHIP ===
    if (action === "transfer_ownership") {
      // Only the current owner can transfer
      const { data: tenant } = await adminClient
        .from("tenants")
        .select("owner_user_id")
        .eq("id", auth.tenantId)
        .single();

      if (!tenant || auth.userId !== tenant.owner_user_id) {
        return errorResponse("Only the account owner can transfer ownership", 403);
      }

      const { member_id } = body;
      if (!member_id) return errorResponse("member_id is required");

      const { data: targetMember } = await adminClient
        .from("tenant_users")
        .select("user_id, role")
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId)
        .single();

      if (!targetMember) return errorResponse("Member not found", 404);
      if (targetMember.role !== "admin") return errorResponse("Ownership can only be transferred to an admin");
      if (targetMember.user_id === auth.userId) return errorResponse("You are already the owner");

      // Transfer: update tenant owner
      await adminClient
        .from("tenants")
        .update({ owner_user_id: targetMember.user_id })
        .eq("id", auth.tenantId);

      // Demote current owner to admin in tenant_users
      // (owner_user_id on tenants table is the source of truth for ownership)

      return successResponse({ message: "Ownership transferred successfully" });
    }

    // === RESEND INVITE ===
    if (action === "resend_invite") {
      if (!["admin"].includes(auth.role)) {
        const { data: t } = await adminClient.from("tenants").select("owner_user_id").eq("id", auth.tenantId).single();
        if (auth.userId !== t?.owner_user_id) return errorResponse("Only admins can resend invites", 403);
      }

      const { member_id } = body;
      if (!member_id) return errorResponse("member_id is required");

      const { data: member } = await adminClient
        .from("tenant_users")
        .select("user_id, status")
        .eq("id", member_id)
        .eq("tenant_id", auth.tenantId)
        .single();

      if (!member) return errorResponse("Member not found", 404);
      if (member.status !== "invited") return errorResponse("This member has already accepted their invite");

      // Get email
      const { data: { user } } = await adminClient.auth.admin.getUserById(member.user_id);
      if (!user?.email) return errorResponse("Could not find email for this user");

      // Resend invite
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(user.email);
      if (inviteError) return errorResponse("Failed to resend invite: " + inviteError.message);

      // Update invited_at
      await adminClient
        .from("tenant_users")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", member_id);

      return successResponse({ message: "Invite resent" });
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
