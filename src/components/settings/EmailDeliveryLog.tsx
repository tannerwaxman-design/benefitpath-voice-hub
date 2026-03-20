import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export function EmailDeliveryLog() {
  const { user } = useAuth();

  const { data: emails, isLoading } = useQuery({
    queryKey: ["email-send-log", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });

  const { data: suppressedEmails } = useQuery({
    queryKey: ["suppressed-emails", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppressed_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Email Delivery Log</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  const statusIcon = (status: string) => {
    if (status === "delivered" || status === "sent") return <CheckCircle2 className="h-3 w-3" />;
    if (status === "bounced" || status === "failed") return <XCircle className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  const statusColor = (status: string) => {
    if (status === "delivered" || status === "sent") return "bg-emerald-500/10 text-emerald-600";
    if (status === "bounced" || status === "failed") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Delivery Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!emails || emails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No emails sent yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Post-call emails and notifications will appear here.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email: any) => (
                    <TableRow key={email.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(email.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{email.to_email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {email.subject || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] border-0 gap-1 ${statusColor(email.status)}`}>
                          {statusIcon(email.status)} {email.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{email.template || email.type || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {suppressedEmails && suppressedEmails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Suppressed Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              These email addresses have been suppressed due to bounces or complaints. Emails will not be sent to these addresses.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppressedEmails.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-foreground">{entry.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{entry.reason || "bounce"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
