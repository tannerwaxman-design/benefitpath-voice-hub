import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-lg border-2 bg-background shadow-sm p-3 min-w-[180px] max-w-[220px] transition-colors ${selected ? "border-purple-500 shadow-md" : "border-border"}`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30">
          <GitBranch className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <span className="text-xs font-semibold text-foreground truncate">{String(data?.label || "Condition")}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{String(data?.conditionType || "interest_level")}</p>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background" />
    </div>
  );
}
