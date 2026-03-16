import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Shield, Briefcase, Eye, Trash2, UserPlus } from "lucide-react";

const ROLE_INFO = [
  { role: "owner", label: "Owner", icon: Crown, color: "text-amber-600", desc: "Full access. Only one per account. Can delete the account." },
  { role: "admin", label: "Admin", icon: Shield, color: "text-primary", desc: "Full access except deleting the account or removing the owner." },
  { role: "manager", label: "Manager", icon: Briefcase, color: "text-blue-600", desc: "Create/edit agents, campaigns, contacts. View all call data. Cannot change billing or team." },
  { role: "viewer", label: "Viewer", icon: Eye, color: "text-muted-foreground", desc: "Read-only access to call logs, analytics, and campaign results." },
];

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function Team() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  const fetchMembers = async () => {
    if (!user?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase.functions.invoke("invite-team-member", {
      body: { action: "list" },
    });
    if (data?.members) setMembers(data.members);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [user?.tenant_id]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: { action: "invite", email: inviteEmail.trim(), role: inviteRole },
    });
    setInviting(false);
    if (error || data?.error) {
      toast({ title: "Failed to invite", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Invitation sent!", description: `${inviteEmail} has been invited as ${inviteRole}.` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
      fetchMembers();
    }
  };

  const handleRemove = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: { action: "remove", member_id: memberId },
    });
    if (error || data?.error) {
      toast({ title: "Failed to remove", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      fetchMembers();
    }
  };

  const getRoleIcon = (role: string) => {
    const info = ROLE_INFO.find(r => r.role === role);
    if (!info) return null;
    const Icon = info.icon;
    return <Icon className={`h-4 w-4 ${info.color}`} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Invite team members to help manage your Voice AI campaigns.</p>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="section-title">Team Members</CardTitle>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />Invite Team Member
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50">
                {["Member", "Role", "Status", "Joined", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center"><Skeleton className="h-4 w-48 mx-auto" /></td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No team members yet. Invite someone to get started.
                </td></tr>
              ) : members.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {m.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {m.email}
                          {m.user_id === user?.id && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {getRoleIcon(m.role)}
                      <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={`text-[10px] border-0 capitalize ${
                      m.status === "active" ? "bg-success/10 text-success" :
                      m.status === "invited" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>{m.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {m.user_id !== user?.id && m.role !== "owner" && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemove(m.id, m.email)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Permissions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="section-title">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLE_INFO.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.role} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${r.color}`} />
                    <span className="font-semibold text-sm text-foreground">{r.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access</SelectItem>
                  <SelectItem value="manager">Manager — Manage agents & campaigns</SelectItem>
                  <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-3 space-y-2">
                {ROLE_INFO.filter(r => r.role !== "owner").map(r => (
                  <div key={r.role} className={`text-xs p-2 rounded ${inviteRole === r.role ? "bg-primary/5 border border-primary/20" : "text-muted-foreground"}`}>
                    <span className="font-medium">{r.label}</span> — {r.desc}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              They'll receive an email invitation to join your team. If they already have an account, they'll be added immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
