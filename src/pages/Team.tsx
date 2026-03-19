import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission, useTeamLimit, PLAN_TEAM_LIMITS } from "@/hooks/use-permission";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Shield, Briefcase, Eye, UserPlus, MoreHorizontal, RefreshCw, Mail, ArrowRightLeft, Lock, Loader2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useDelayedLoading } from "@/hooks/use-delayed-loading";

const ROLE_META: Record<string, { label: string; icon: typeof Crown; badgeClass: string; desc: string }> = {
  owner: { label: "Owner", icon: Crown, badgeClass: "bg-purple-100 text-purple-700 border-purple-200", desc: "Full access to everything including billing and team management. Only one per account." },
  admin: { label: "Admin", icon: Shield, badgeClass: "bg-primary/10 text-primary border-primary/20", desc: "Full access to agents, campaigns, calls, tools, voices, and team management. Cannot change billing or delete the account." },
  manager: { label: "Manager", icon: Briefcase, badgeClass: "bg-blue-100 text-blue-700 border-blue-200", desc: "Can create and edit agents, run campaigns, upload contacts, view all call data and analytics. Cannot manage team, billing, or phone numbers." },
  viewer: { label: "Viewer", icon: Eye, badgeClass: "bg-muted text-muted-foreground border-border", desc: "Read-only access. Can view call logs, analytics, and campaign results. Cannot create, edit, or delete anything." },
};

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
  invited_at: string | null;
  accepted_at: string | null;
}

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-64 mt-2" /></div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-40" />
        </CardHeader>
        <CardContent className="p-0">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b last:border-0">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Team() {
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const canView = usePermission("team.view");
  const canInvite = usePermission("team.invite");
  const { limit: teamLimit, planName } = useTeamLimit();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("manager");
  const [inviting, setInviting] = useState(false);

  // Role change
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [roleChangeMember, setRoleChangeMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState("");
  const [changingRole, setChangingRole] = useState(false);

  // Remove confirm
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  // Transfer ownership
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferMember, setTransferMember] = useState<TeamMember | null>(null);
  const [transferConfirm, setTransferConfirm] = useState("");
  const [transferring, setTransferring] = useState(false);

  const showSkeleton = useDelayedLoading(loading);

  const fetchMembers = useCallback(async () => {
    if (!user?.tenant_id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("invite-team-member", {
        body: { action: "list" },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setMembers(data?.members || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const isOwner = user?.role === "admin" && members.some(m => m.user_id === user?.id && m.role === "owner");
  const currentUserIsOwner = members.find(m => m.user_id === user?.id)?.role === "owner";
  const activeCount = members.filter(m => m.status === "active" || m.status === "invited").length;
  const atLimit = activeCount >= teamLimit;

  // Plan gating for Starter
  if (!loading && planName === "voice_ai_starter") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Invite your team members to manage agents, campaigns, and call activity.</p>
        </div>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-8 text-center">
            <Lock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Team Management is available on the Professional plan</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Upgrade to invite team members and manage roles. Each person gets their own login.</p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/billing")}>Upgrade to Professional — $149/mo</Button>
              <Button variant="outline" onClick={() => navigate("/billing")}>Compare Plans</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSkeleton) return <TeamSkeleton />;
  if (error) return (
    <div className="space-y-6">
      <div><h1 className="page-title">Team</h1></div>
      <ErrorState message={error} onRetry={fetchMembers} />
    </div>
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("invite-team-member", {
        body: { action: "invite", email: inviteEmail.trim(), role: inviteRole },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Invite sent!", description: `${inviteEmail} has been invited as ${ROLE_META[inviteRole]?.label || inviteRole}.` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("manager");
      fetchMembers();
    } catch (e: unknown) {
      toast({ title: "Failed to invite", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeMember) return;
    setRemoving(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("invite-team-member", {
        body: { action: "remove", member_id: removeMember.id },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Member removed", description: `${removeMember.email} has been removed from the team.` });
      setRemoveOpen(false);
      setRemoveMember(null);
      fetchMembers();
    } catch (e: unknown) {
      toast({ title: "Failed to remove", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeMember || !newRole) return;
    setChangingRole(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("invite-team-member", {
        body: { action: "update_role", member_id: roleChangeMember.id, role: newRole },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Role updated", description: `${roleChangeMember.email} is now a ${ROLE_META[newRole]?.label || newRole}.` });
      setRoleChangeOpen(false);
      setRoleChangeMember(null);
      fetchMembers();
    } catch (e: unknown) {
      toast({ title: "Failed to change role", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setChangingRole(false);
    }
  };

  const handleResendInvite = async (member: TeamMember) => {
    try {
      const { data, error: err } = await supabase.functions.invoke("invite-team-member", {
        body: { action: "resend_invite", member_id: member.id },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Invite resent", description: `A new invitation was sent to ${member.email}.` });
    } catch (e: unknown) {
      toast({ title: "Failed to resend invite", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferMember || transferConfirm !== "TRANSFER") return;
    setTransferring(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("invite-team-member", {
        body: { action: "transfer_ownership", member_id: transferMember.id },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Ownership transferred", description: `${transferMember.email} is now the account owner.` });
      setTransferOpen(false);
      setTransferMember(null);
      setTransferConfirm("");
      fetchMembers();
      refreshProfile();
    } catch (e: unknown) {
      toast({ title: "Transfer failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  const currentMember = members.find(m => m.user_id === user?.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Invite your team members to manage agents, campaigns, and call activity. Each person gets their own login.</p>
      </div>

      {/* Current User Banner */}
      {currentMember && (
        <Card className="bg-secondary/30 border-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                {(currentMember.full_name || currentMember.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground">{currentMember.full_name || currentMember.email.split("@")[0]}</p>
                <p className="text-sm text-muted-foreground">{currentMember.email}</p>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="outline" className={`${ROLE_META[currentMember.role]?.badgeClass || ""} text-xs`}>
                  {ROLE_META[currentMember.role]?.label || currentMember.role}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Since {new Date(currentMember.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team limit warning */}
      {atLimit && planName !== "voice_ai_enterprise" && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">You've reached your team limit ({activeCount}/{teamLimit} members).</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {planName === "voice_ai_pro"
                  ? "Upgrade to Agency to invite up to 10 team members."
                  : "Contact us for unlimited team members."}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/billing")}>
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Members Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="card-title">Team Members</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{activeCount}/{teamLimit} seats</span>
            {canInvite && (
              <Button size="sm" onClick={() => setInviteOpen(true)} disabled={atLimit}>
                <UserPlus className="h-4 w-4 mr-2" />Invite Team Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No team members yet"
              description="Invite your first team member to start collaborating."
              actionLabel={canInvite ? "Invite Team Member" : undefined}
              onAction={canInvite ? () => setInviteOpen(true) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Joined</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const isSelf = m.user_id === user?.id;
                    const isOwnerRow = m.role === "owner";
                    const isAdmin = m.role === "admin";
                    const canManageThis = currentUserIsOwner || (!isOwnerRow && !isAdmin && canInvite);

                    return (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {(m.full_name || m.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {m.full_name || (m.status === "invited" ? "Pending" : m.email.split("@")[0])}
                                {isSelf && <span className="text-xs text-muted-foreground ml-1.5">(you)</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{m.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`${ROLE_META[m.role]?.badgeClass || ""} text-[10px] capitalize`}>
                            {ROLE_META[m.role]?.label || m.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${
                              m.status === "active" ? "bg-success" :
                              m.status === "invited" ? "bg-warning" :
                              "bg-destructive"
                            }`} />
                            <span className="text-sm text-muted-foreground capitalize">{m.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {m.accepted_at
                            ? new Date(m.accepted_at).toLocaleDateString()
                            : m.invited_at
                              ? `Invited ${new Date(m.invited_at).toLocaleDateString()}`
                              : new Date(m.created_at).toLocaleDateString()
                          }
                        </td>
                        <td className="px-4 py-3">
                          {!isSelf && !isOwnerRow && canManageThis && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="More options">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setRoleChangeMember(m);
                                  setNewRole(m.role);
                                  setRoleChangeOpen(true);
                                }}>
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />Change Role
                                </DropdownMenuItem>
                                {m.status === "invited" && (
                                  <DropdownMenuItem onClick={() => handleResendInvite(m)}>
                                    <Mail className="h-4 w-4 mr-2" />Resend Invite
                                  </DropdownMenuItem>
                                )}
                                {currentUserIsOwner && isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => {
                                      setTransferMember(m);
                                      setTransferConfirm("");
                                      setTransferOpen(true);
                                    }}>
                                      <Crown className="h-4 w-4 mr-2" />Transfer Ownership
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                  setRemoveMember(m);
                                  setRemoveOpen(true);
                                }}>
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="card-title">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(ROLE_META).map(([key, r]) => {
              const Icon = r.icon;
              return (
                <div key={key} className="p-4 border rounded-lg space-y-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline" className={`${r.badgeClass} text-xs`}>{r.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Invite Modal ─── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>They'll receive an email invitation to join your team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email address</Label>
              <Input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-3 space-y-2 p-3 bg-secondary/30 rounded-lg">
                {Object.entries(ROLE_META).map(([key, r]) => {
                  const Icon = r.icon;
                  const isSelected = inviteRole === key;
                  const isOwnerRole = key === "owner";
                  return (
                    <div key={key} className={`text-xs p-2.5 rounded-md transition-colors ${isSelected ? "bg-primary/5 border border-primary/20" : isOwnerRole ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="font-medium">{r.label}</span>
                        {isOwnerRole && <span className="text-muted-foreground">— Cannot be assigned</span>}
                      </div>
                      {!isOwnerRole && <p className="text-muted-foreground pl-5">{r.desc}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Change Role Modal ─── */}
      <Dialog open={roleChangeOpen} onOpenChange={setRoleChangeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Update the role for {roleChangeMember?.email}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            {newRole && ROLE_META[newRole] && (
              <p className="text-xs text-muted-foreground mt-2 p-2 bg-secondary/30 rounded">
                <strong>{ROLE_META[newRole].label}:</strong> {ROLE_META[newRole].desc}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeOpen(false)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={changingRole || newRole === roleChangeMember?.role}>
              {changingRole ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Remove Confirm ─── */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke {removeMember?.email}'s access to your Voice AI dashboard. They won't be able to view or manage any data. You can re-invite them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Removing...</> : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Transfer Ownership Modal ─── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              This will make <strong>{transferMember?.full_name || transferMember?.email}</strong> the new Owner of this account. You will be changed to an Admin role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-medium mb-1">⚠️ This action cannot be easily undone.</p>
              <p className="text-xs">The new owner will have full control including billing, team management, and the ability to delete the account.</p>
            </div>
            <div>
              <Label>Type "TRANSFER" to confirm</Label>
              <Input value={transferConfirm} onChange={e => setTransferConfirm(e.target.value)} placeholder="TRANSFER" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTransferOwnership}
              disabled={transferring || transferConfirm !== "TRANSFER"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {transferring ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Transferring...</> : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
