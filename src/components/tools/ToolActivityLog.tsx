import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";

export function ToolActivityLog() {
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["tool-activity-log", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Tool Activity Log</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Tool Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No tool activity yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Tool invocations during calls will appear here.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Call ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {log.tool_name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {log.call_id ? log.call_id.slice(0, 8) + "..." : "-"}
                    </TableCell>
                    <TableCell>
                      {log.status === "success" ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </Badge>
                      ) : log.status === "error" ? (
                        <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive border-0 gap-1">
                          <XCircle className="h-3 w-3" /> Error
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Clock className="h-3 w-3" /> {log.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.duration_ms ? `${log.duration_ms}ms` : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.error_message || (log.response_preview ? log.response_preview.slice(0, 100) : "-")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
