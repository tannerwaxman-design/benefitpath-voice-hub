import { useState } from "react";
import { useTutorial, OnboardingChecklist } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CHECKLIST_ITEMS: { key: keyof OnboardingChecklist; label: string; path: string }[] = [
  { key: "agent_created", label: "Create an AI agent", path: "/agents" },
  { key: "test_call_made", label: "Make a test call", path: "/agents" },
  { key: "voice_selected", label: "Pick a voice", path: "/voices" },
  { key: "contacts_uploaded", label: "Upload contacts", path: "/contacts" },
  { key: "phone_imported", label: "Import a phone number", path: "/phone-numbers" },
];

export function GettingStartedChecklist() {
  const { checklist, checklistDismissed, tutorialCompleted, dismissChecklist } = useTutorial();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Only show after tutorial is done and not dismissed
  if (!tutorialCompleted || checklistDismissed) return null;

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const allDone = completedCount === CHECKLIST_ITEMS.length;

  // Hide if all done
  if (allDone) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-72 bg-card border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-secondary/30 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Getting Started</span>
          <span className="text-xs text-muted-foreground">{completedCount}/{CHECKLIST_ITEMS.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {collapsed ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-3 space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const done = checklist[item.key];
            return (
              <button
                key={item.key}
                className="flex items-center gap-2.5 w-full text-left text-sm group"
                onClick={() => !done && navigate(item.path)}
                disabled={done}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                )}
                <span className={done ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary transition-colors"}>
                  {item.label}
                </span>
              </button>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={dismissChecklist}
          >
            <X className="h-3 w-3 mr-1" /> Dismiss forever
          </Button>
        </div>
      )}
    </div>
  );
}
