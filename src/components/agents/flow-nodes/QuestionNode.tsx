import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HelpCircle } from "lucide-react";

export function QuestionNode({ data, selected }: NodeProps) {
  const branches = (data?.branches as { label: string; id: string }[]) || [];
  return (
    <div className={`rounded-lg border-2 bg-background shadow-sm p-3 min-w-[180px] max-w-[220px] transition-colors ${selected ? "border-amber-500 shadow-md" : "border-border"}`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30">
          <HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="text-xs font-semibold text-foreground truncate">{String(data?.label || "Question")}</span>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{String(data?.text || "Configure question...")}</p>
      {branches.length > 0 && (
        <div className="flex gap-1 mt-2">
          {branches.map((b) => (
            <span key={b.id} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{b.label}</span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background" />
    </div>
  );
}
