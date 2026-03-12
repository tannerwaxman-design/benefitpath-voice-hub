import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { agents } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MoreVertical, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function AgentBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Agent Builder</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
          <Card key={agent.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/agents/${agent.id}`)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{agent.name} — {agent.title}</p>
                    <Badge variant="secondary" className={agent.status === "active" ? "bg-success/10 text-success border-0 text-[10px] mt-1" : "bg-secondary text-muted-foreground border-0 text-[10px] mt-1"}>
                      {agent.status === "active" ? "Active" : "Draft"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: "Agent duplicated" }); }}>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: "Agent deactivated" }); }}>Deactivate</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); toast({ title: "Agent deleted", variant: "destructive" }); }}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-muted-foreground">{agent.calls.toLocaleString()} calls • {agent.successRate}% success rate</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-[10px]">{agent.industry}</Badge>
                <span className="text-xs text-muted-foreground">Modified {agent.lastModified}</span>
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
      </div>
    </div>
  );
}
