import { useNavigate } from "react-router-dom";
import { useAgents, useDeleteAgent } from "@/hooks/use-agents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, MoreVertical, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentBuilder() {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useAgents();
  const deleteAgent = useDeleteAgent();

  const syncBadge = (status: string) => {
    switch (status) {
      case "synced": return <Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px] mt-1">Synced</Badge>;
      case "pending": return <Badge variant="secondary" className="bg-warning/10 text-warning border-0 text-[10px] mt-1">Pending Sync</Badge>;
      case "error": return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 text-[10px] mt-1">Sync Error</Badge>;
      default: return <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0 text-[10px] mt-1">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Agent Builder</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Agent Builder</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents?.map(agent => (
          <Card key={agent.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/agents/${agent.id}`)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{agent.agent_name}{agent.agent_title ? ` — ${agent.agent_title}` : ""}</p>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className={agent.status === "active" ? "bg-success/10 text-success border-0 text-[10px] mt-1" : "bg-secondary text-muted-foreground border-0 text-[10px] mt-1"}>
                        {agent.status === "active" ? "Active" : "Draft"}
                      </Badge>
                      {syncBadge(agent.vapi_sync_status)}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteAgent.mutate(agent.id); }}>
                      {deleteAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-muted-foreground">{agent.total_calls.toLocaleString()} calls • {(agent.success_rate || 0)}% success rate</p>
              <div className="flex items-center gap-2 mt-3">
                {agent.industry && <Badge variant="outline" className="text-[10px]">{agent.industry}</Badge>}
                <span className="text-xs text-muted-foreground">Modified {new Date(agent.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Create New Agent Card */}
        <Card className="border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center min-h-[180px]"
          onClick={() => navigate("/agents/new")}>
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-primary">Create New Agent</p>
          </CardContent>
        </Card>

        {/* Empty state */}
        {agents?.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No agents yet</p>
            <p className="text-sm text-muted-foreground">Create your first AI agent to start making calls.</p>
          </div>
        )}
      </div>
    </div>
  );
}
