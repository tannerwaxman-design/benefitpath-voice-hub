import { Handle, Position, type NodeProps } from "@xyflow/react";
import { PhoneOff } from "lucide-react";

export function EndNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-lg border-2 bg-background shadow-sm p-3 min-w-[180px] max-w-[220px] transition-colors ${selected ? "border-red-500 shadow-md" : "border-border"}`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-red-500 !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded bg-red-100 dark:bg-red-900/30">
          <PhoneOff className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        </div>
        <span className="text-xs font-semibold text-foreground truncate">{String(data?.label || "End Call")}</span>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2">{String(data?.closingMessage || "Goodbye")}</p>
    </div>
  );
}
