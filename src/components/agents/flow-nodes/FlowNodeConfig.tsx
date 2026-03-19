import { Node } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface FlowNodeConfigProps {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  allNodes: Node[];
}

export function FlowNodeConfig({ node, onUpdate, onDelete, allNodes }: FlowNodeConfigProps) {
  const d = node.data as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground capitalize">{node.type} Node</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div>
        <Label className="text-xs">Label</Label>
        <Input value={String(d.label || "")} onChange={(e) => onUpdate({ label: e.target.value })} className="mt-1 h-8 text-xs" />
      </div>

      {(node.type === "message" || node.type === "question") && (
        <div>
          <Label className="text-xs">{node.type === "question" ? "Question text" : "What the AI says"}</Label>
          <Textarea
            value={String(d.text || "")}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={4}
            className="mt-1 text-xs"
            placeholder="Enter the script..."
          />
        </div>
      )}

      {node.type === "condition" && (
        <div>
          <Label className="text-xs">Condition type</Label>
          <Select value={String(d.conditionType || "interest_level")} onValueChange={(v) => onUpdate({ conditionType: v })}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="interest_level">Interest level</SelectItem>
              <SelectItem value="time_of_day">Time of day</SelectItem>
              <SelectItem value="lead_score">Lead score</SelectItem>
              <SelectItem value="previous_calls">Previous calls</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {node.type === "tool" && (
        <div>
          <Label className="text-xs">Tool action</Label>
          <Select value={String(d.toolAction || "book_appointment")} onValueChange={(v) => onUpdate({ toolAction: v })}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="book_appointment">Book appointment</SelectItem>
              <SelectItem value="create_contact">Create contact</SelectItem>
              <SelectItem value="check_availability">Check availability</SelectItem>
              <SelectItem value="send_email">Send email</SelectItem>
              <SelectItem value="update_crm">Update CRM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {node.type === "transfer" && (
        <div>
          <Label className="text-xs">Transfer announcement</Label>
          <Textarea
            value={String(d.announcement || "")}
            onChange={(e) => onUpdate({ announcement: e.target.value })}
            rows={3}
            className="mt-1 text-xs"
          />
        </div>
      )}

      {node.type === "end" && (
        <div>
          <Label className="text-xs">Closing message</Label>
          <Textarea
            value={String(d.closingMessage || "")}
            onChange={(e) => onUpdate({ closingMessage: e.target.value })}
            rows={3}
            className="mt-1 text-xs"
          />
        </div>
      )}

      {node.type === "objection" && (
        <>
          <div>
            <Label className="text-xs">When they say</Label>
            <Textarea
              value={String(d.objection || "")}
              onChange={(e) => onUpdate({ objection: e.target.value })}
              rows={2}
              className="mt-1 text-xs"
              placeholder='"I already have coverage"'
            />
          </div>
          <div>
            <Label className="text-xs">Respond with</Label>
            <Textarea
              value={String(d.response || "")}
              onChange={(e) => onUpdate({ response: e.target.value })}
              rows={3}
              className="mt-1 text-xs"
              placeholder="That's great that you have coverage..."
            />
          </div>
        </>
      )}

      <div className="pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">Drag from node handles to create connections. Click the canvas to deselect.</p>
      </div>
    </div>
  );
}
