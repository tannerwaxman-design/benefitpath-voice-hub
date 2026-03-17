import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {message || "We couldn't load this data. Check your connection and try again."}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>Try Again</Button>
      )}
    </div>
  );
}
