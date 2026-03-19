import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MessageSquare } from "lucide-react";

export function MessageNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-lg border-2 bg-background shadow-sm p-3 min-w-[180px] max-w-[220px] transition-colors ${selected ? "border-primary shadow-md" : "border-border"}`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
          <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <span className="text-xs font-semibold text-foreground truncate">{String(data?.label || "Message")}</span>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{String(data?.text || "Configure message...")}</p>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
    </div>
  );
}
