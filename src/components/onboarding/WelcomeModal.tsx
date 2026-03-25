import { useTutorial } from "@/contexts/TutorialContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

export function WelcomeModal() {
  const { showWalkthrough, currentStep, advanceStep } = useTutorial();

  // Only show on step 0 (the welcome step)
  if (!showWalkthrough || currentStep !== 0) return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="px-8 py-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to BenefitPath Voice AI!
          </h2>
          <p className="text-muted-foreground mb-6">
            Let me walk you through everything. By the end, you'll have a working AI agent that can make real phone calls.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            This takes about 3 minutes. Let's go!
          </p>

          <Button
            className="w-full h-12 gap-3"
            onClick={advanceStep}
          >
            <Rocket className="h-5 w-5" />
            Let's Go →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
