import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      <div className="flex gap-3">
        {secondaryLabel && onSecondary && (
          <Button variant="outline" onClick={onSecondary}>{secondaryLabel}</Button>
        )}
        {actionLabel && onAction && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
      </div>
    </div>
  );
}
