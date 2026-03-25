import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTutorial } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ArrowRight, MapPin } from "lucide-react";

const TOTAL_STEPS = 7;

interface StepConfig {
  targetSelector: string;
  route: string;
  title: string;
  description: string;
  actionLabel: string;
  actionType: "next" | "click-target" | "navigate";
  navigateTo?: string;
  position?: "right" | "bottom" | "left" | "top";
}

const STEPS: Record<number, StepConfig> = {
  1: {
    targetSelector: "aside",
    route: "/",
    title: "This is your command center.",
    description: "Everything you need is in this sidebar. Build agents, launch campaigns, review calls, and track your results.\n\nLet's start by creating your first AI agent.",
    actionLabel: "Go to Agent Builder",
    actionType: "navigate",
    navigateTo: "/agents",
    position: "right",
  },
  2: {
    targetSelector: '[data-tutorial="create-agent"],.border-dashed',
    route: "/agents",
    title: "Create your first AI agent.",
    description: "An agent is your AI caller. You give it a name, a voice, a script, and it makes calls for you.\n\nClick the create button to start.",
    actionLabel: "Click the button to continue",
    actionType: "navigate",
    navigateTo: "/agents/new",
    position: "bottom",
  },
  3: {
    targetSelector: '[data-tutorial="agent-basics"],.page-title',
    route: "/agents/new",
    title: "Give your agent an identity.",
    description: "This is the name and title your agent will introduce themselves with on calls.\n\nFill in a name and details, then continue.",
    actionLabel: "Next → Pick a voice",
    actionType: "next",
    position: "right",
  },
  4: {
    targetSelector: '[data-tutorial="voice-selector"],select,[data-tutorial="agent-voice"]',
    route: "/agents/new",
    title: "Choose how your agent sounds.",
    description: "Pick a voice from the options. You can click play to hear a sample before choosing.\n\nWant your AI to sound like YOU? You can clone your voice later on the Voices page.",
    actionLabel: "Save Agent to continue",
    actionType: "next",
    position: "bottom",
  },
  5: {
    targetSelector: '[data-tutorial="test-panel"],.space-y-6',
    route: "",
    title: "Let's hear your agent!",
    description: "You can test your agent right here without using a phone number.\n\nTry the Chat mode to see what your agent says, or use Voice Call to have a real conversation through your browser.",
    actionLabel: "Done testing → Next step",
    actionType: "next",
    position: "right",
  },
  6: {
    targetSelector: ".page-title",
    route: "/campaigns",
    title: "This is where you launch calls.",
    description: "A campaign takes your AI agent, a list of contacts, and a phone number, and starts calling automatically.\n\nBefore you can launch you'll need:\n✅ An AI agent (you just made one!)\n📋 A contact list (upload a CSV)\n📞 A phone number (import from Twilio)",
    actionLabel: "Next → Finish",
    actionType: "next",
    position: "bottom",
  },
  7: {
    targetSelector: "",
    route: "",
    title: "",
    description: "",
    actionLabel: "",
    actionType: "next",
  },
};

export function TutorialOverlay() {
  const { showTutorial, currentStep, advanceStep, skipTutorial } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 200, left: 400 });
  const [cutoutRect, setCutoutRect] = useState<DOMRect | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const step = STEPS[currentStep];

  const updatePosition = useCallback(() => {
    if (!step?.targetSelector || currentStep === 7) return;
    const el = document.querySelector(step.targetSelector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCutoutRect(rect);

    const pos = step.position || "right";
    const tooltipW = 340;
    const tooltipH = 200;
    let top = rect.top;
    let left = rect.right + 16;

    if (pos === "bottom") {
      top = rect.bottom + 16;
      left = rect.left + (rect.width - tooltipW) / 2;
    } else if (pos === "left") {
      left = rect.left - tooltipW - 16;
    } else if (pos === "top") {
      top = rect.top - tooltipH - 16;
      left = rect.left;
    }

    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipH - 16));

    setTooltipPos({ top, left });
  }, [step, currentStep]);

  useEffect(() => {
    if (!showTutorial || !step) return;
    if (currentStep === 7) {
      setShowCompletion(true);
      return;
    }
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [showTutorial, currentStep, step, location.pathname, navigate]);

  useEffect(() => {
    if (!showTutorial || currentStep === 7) return;
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showTutorial, currentStep, location.pathname, updatePosition]);

  if (!showTutorial || !step) return null;

  if (currentStep === 7 || showCompletion) {
    return <CompletionModal onClose={() => { skipTutorial(); setShowCompletion(false); }} />;
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const handleAction = () => {
    if (step.actionType === "navigate" && step.navigateTo) {
      navigate(step.navigateTo);
      advanceStep();
    } else {
      advanceStep();
    }
  };

  return (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: "none" }}>
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutoutRect && (
              <rect
                x={cutoutRect.left - 8}
                y={cutoutRect.top - 8}
                width={cutoutRect.width + 16}
                height={cutoutRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      <div className="fixed top-0 left-0 right-0 z-[9999] bg-background/90 backdrop-blur-sm border-b px-4 py-2 flex items-center gap-4" style={{ pointerEvents: "auto" }}>
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          Step {currentStep} of {TOTAL_STEPS}
        </span>
        <Progress value={progress} className="h-2 flex-1" />
        <Button variant="ghost" size="sm" onClick={skipTutorial} className="text-muted-foreground">
          Skip <X className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div
        className="fixed z-[9999] w-[340px] bg-card border rounded-xl shadow-2xl p-5 animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ top: tooltipPos.top, left: tooltipPos.left, pointerEvents: "auto" }}
      >
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">
          {step.description}
        </p>
        <Button onClick={handleAction} size="sm" className="w-full">
          {step.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function CompletionModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center animate-in fade-in-0 zoom-in-95">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You're all set!</h2>
        <p className="text-muted-foreground mb-6">
          You've created your first AI agent and heard it in action. Here's what to do next:
        </p>

        <div className="text-left space-y-4 mb-8">
          {[
            { icon: "📋", title: "Upload your contacts", desc: "Go to Contact Lists and upload a CSV of your leads", path: "/contacts" },
            { icon: "📞", title: "Get a phone number", desc: "Go to Phone Numbers and import from Twilio", path: "/phone-numbers" },
            { icon: "🚀", title: "Launch your first campaign", desc: "Go to Campaigns and put it all together", path: "/campaigns" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 text-sm">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Need help anytime? Look for the ❓ icon or restart this tutorial in Settings.
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { onClose(); navigate("/contacts"); }}
          >
            Go to Contact Lists
          </Button>
          <Button
            className="flex-1"
            onClick={() => { onClose(); navigate("/"); }}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
