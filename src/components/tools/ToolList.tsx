import { Calendar, UserPlus, FileEdit, Mail, Bell, Zap, Wrench, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTools, useDeleteTool, useUpdateTool, type Tool } from "@/hooks/use-tools";
import { useAgents } from "@/hooks/use-agents";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  book_appointment: Calendar,
  create_contact: UserPlus,
  update_contact: FileEdit,
  send_followup: Mail,
  notify: Bell,
  custom_webhook: Zap,
  custom: Wrench,
};

const SERVICE_BADGES: Record<string, string> = {
  ghl: "CRM",
  hubspot: "CRM",
  salesforce: "CRM",
  google_calendar: "Calendar",
  custom_webhook: "Webhook",
  custom: "Custom",
};

interface ToolListProps {
  onCreateNew: () => void;
}

export function ToolList({ onCreateNew }: ToolListProps) {
  const { data: tools = [], isLoading } = useTools();
  const { data: agents = [] } = useAgents();
  const deleteTool = useDeleteTool();
  const updateTool = useUpdateTool();

  const agentMap = new Map(agents.map((a) => [a.id, a.agent_name]));

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading tools...</div>;
  }

  if (tools.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Wrench className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No tools yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tools let your AI agent take real actions during calls — like booking appointments or updating your CRM. Create your first tool in minutes.
        </p>
        <Button onClick={onCreateNew}>Create Your First Tool</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tools.map((tool) => {
        const Icon = TEMPLATE_ICONS[tool.template || "custom"] || Wrench;
        const assignedNames = (tool.assigned_agent_ids || [])
          .map((id: string) => agentMap.get(id))
          .filter(Boolean);

        return (
          <div key={tool.id} className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{tool.name}</h3>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">
                    {SERVICE_BADGES[tool.service] || tool.service}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-xs ${tool.status === "active" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <span className={`h-2 w-2 rounded-full ${tool.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  {tool.status === "active" ? "Active" : "Inactive"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateTool.mutate({ id: tool.id, status: tool.status === "active" ? "inactive" : "active" })}>
                      {tool.status === "active" ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteTool.mutate(tool.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
            <p className="text-xs text-muted-foreground">
              {assignedNames.length > 0 ? `Used by: ${assignedNames.join(", ")}` : "Not assigned to any agent"}
            </p>
          </div>
        );
      })}

      {/* Create new card */}
      <button
        onClick={onCreateNew}
        className="rounded-lg border border-dashed p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[160px]"
      >
        <Plus className="h-8 w-8" />
        <span className="text-sm font-medium">Create New Tool</span>
      </button>
    </div>
  );
}
