import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ContextualHelpProps {
  text: string;
  className?: string;
}

export function ContextualHelp({ text, className = "" }: ContextualHelpProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={`inline-flex items-center text-muted-foreground hover:text-foreground transition-colors ${className}`}>
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
