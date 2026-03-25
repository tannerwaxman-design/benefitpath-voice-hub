import { useNavigate } from "react-router-dom";
import { useTutorial } from "@/contexts/TutorialContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Wrench, SkipForward, CheckCircle2 } from "lucide-react";

export function WelcomeModal() {
  const { showWelcome, startTutorial } = useTutorial();
  const navigate = useNavigate();

  if (!showWelcome) return null;

  return (
    <Dialog open={showWelcome} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="px-8 py-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to BenefitPath Voice AI
          </h2>
          <p className="text-muted-foreground mb-6">
            Let's get you set up in about 3 minutes.<br />
            I'll walk you through everything step by step.
          </p>

          <div className="text-left bg-secondary/30 rounded-lg p-4 mb-8 space-y-2">
            <p className="text-sm font-medium text-foreground mb-3">By the end you'll have:</p>
            {[
              "Your first AI voice agent created",
              "Made a test call to hear it in action",
              "Everything you need to launch your first campaign",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mb-4">How do you want to get started?</p>

          <div className="space-y-2">
            <Button
              className="w-full justify-start gap-3 h-12"
              variant="default"
              onClick={() => {
                startTutorial("forge");
                navigate("/forge");
              }}
            >
              <Flame className="h-5 w-5 text-amber-400" />
              <div className="text-left">
                <p className="font-medium">Build with Forge</p>
                <p className="text-xs opacity-70">AI builds it for you</p>
              </div>
            </Button>

            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={() => startTutorial("manual")}
            >
              <Wrench className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Build manually</p>
                <p className="text-xs text-muted-foreground">I'll walk you through it</p>
              </div>
            </Button>

            <Button
              className="w-full justify-start gap-3 h-12"
              variant="ghost"
              onClick={() => startTutorial("skip")}
            >
              <SkipForward className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Skip tutorial</p>
                <p className="text-xs text-muted-foreground">I'll figure it out</p>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
