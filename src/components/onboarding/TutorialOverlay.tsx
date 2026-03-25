import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTutorial } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TOTAL_STEPS = 10;

interface StepConfig {
  targetSelector: string;
  route?: string;
  title: string;
  description: string;
  buttonText: string;
  action: "click_next" | "click_target";
  navigateTo?: string;
  position?: "right" | "bottom" | "left" | "top";
}

// Steps 1-4, 6-9 are defined here. Step 0 is WelcomeModal, Step 5 is Forge conversation (overlay hidden), Step 10 is completion.
const STEPS: Record<number, StepConfig> = {
  1: {
    targetSelector: '[data-walkthrough="sidebar"]',
    route: "/",
    title: "📍 Your Command Center",
    description: "Everything lives here: build agents, launch campaigns, review calls, track results.\n\nLet me show you the most important parts.",
    buttonText: "Next →",
    action: "click_next",
    position: "right",
  },
  2: {
    targetSelector: '[data-walkthrough="nav-forge"]',
    route: "/",
    title: "📍 This is Forge",
    description: "Instead of filling out forms, you just chat with Forge and it builds your AI calling agent for you.\n\nClick Forge to open it →",
    buttonText: "",
    action: "click_target",
    navigateTo: "/forge",
    position: "right",
  },
  3: {
    targetSelector: '[data-walkthrough="forge-templates"]',
    route: "/forge",
    title: "📍 Pick your starting point",
    description: "These are pre-built templates for common use cases. Pick one and Forge will customize it for your business.\n\nClick a template to start →",
    buttonText: "",
    action: "click_target",
    position: "bottom",
  },
  4: {
    // Transitional step — immediately pauses overlay for Forge conversation
    targetSelector: "body",
    title: "",
    description: "",
    buttonText: "",
    action: "click_next",
  },
  // Step 5: Forge conversation — overlay is paused, handled by TutorialContext
  6: {
    targetSelector: '[data-walkthrough="forge-test-button"]',
    route: "/forge",
    title: "📍 Hear your agent!",
    description: "This is the best part. Test your new agent right now — chat with it or have a real voice call through your browser.\n\nClick to test your agent →",
    buttonText: "",
    action: "click_target",
    position: "top",
  },
  7: {
    targetSelector: '[data-walkthrough="nav-agent-builder"]',
    title: "📍 Want to fine-tune?",
    description: "The Agent Builder is where you can manually edit everything Forge created — the greeting, voice, objection handling, compliance settings, and more.\n\nClick Agent Builder to see it →",
    buttonText: "",
    action: "click_target",
    navigateTo: "/agents",
    position: "right",
  },
  8: {
    // Quick sidebar tour — Campaigns, Contacts, Call Logs, Leads, Voices, War Room
    targetSelector: '[data-walkthrough="nav-campaigns"]',
    title: "📍 Campaigns",
    description: "This is where you launch outbound calling. Pick your agent, upload a contact list, choose a phone number, and your AI starts calling automatically.",
    buttonText: "Next →",
    action: "click_next",
    position: "right",
  },
  9: {
    targetSelector: "body",
    title: "",
    description: "",
    buttonText: "",
    action: "click_next",
  },
  10: {
    targetSelector: "body",
    title: "",
    description: "",
    buttonText: "",
    action: "click_next",
  },
};

// Sub-steps for the quick sidebar tour (step 8 expands into these)
const QUICK_TOUR_ITEMS = [
  { selector: '[data-walkthrough="nav-campaigns"]', title: "📍 Campaigns", desc: "This is where you launch outbound calling. Pick your agent, upload a contact list, choose a phone number, and your AI starts calling automatically." },
  { selector: '[data-walkthrough="nav-contacts"]', title: "📍 Contact Lists", desc: "Upload your leads here as a CSV file. Names, phone numbers, and emails. These are the people your agent will call." },
  { selector: '[data-walkthrough="nav-call-logs"]', title: "📍 Call Logs", desc: "Every call your agent makes shows up here with full transcripts, recordings, outcomes, and AI scoring." },
  { selector: '[data-walkthrough="nav-leads"]', title: "📍 Leads", desc: "After calls, your leads are automatically scored and sorted: Hot, Warm, Cold, or Dead. Focus your time on the hot ones." },
  { selector: '[data-walkthrough="nav-voices"]', title: "📍 Voices", desc: "Browse preset voices, clone your own voice, and test how any voice sounds before using it on real calls." },
  { selector: '[data-walkthrough="nav-war-room"]', title: "📍 War Room", desc: "Your real-time battle station. Watch live calls, track appointments, and see your whole operation on one screen. Perfect for AEP season." },
];

export function TutorialOverlay() {
  const { showWalkthrough, currentStep, advanceStep, skipTutorial, overlayPaused } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const [cutoutRect, setCutoutRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 200, left: 400 });
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [quickTourIndex, setQuickTourIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const step = STEPS[currentStep];
  const isQuickTour = currentStep === 8;
  const activeItem = isQuickTour ? QUICK_TOUR_ITEMS[quickTourIndex] : null;

  // Navigate to step's route if needed
  useEffect(() => {
    if (!showWalkthrough || overlayPaused || !step) return;
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [showWalkthrough, currentStep, overlayPaused]);

  // Step 4 is a pass-through to step 5 (Forge conversation)
  useEffect(() => {
    if (showWalkthrough && currentStep === 4) {
      advanceStep(); // goes to 5, which pauses overlay
    }
  }, [showWalkthrough, currentStep]);

  // Show completion modal
  useEffect(() => {
    if (showWalkthrough && currentStep === 9) {
      setShowCompletion(true);
    }
  }, [showWalkthrough, currentStep]);

  // Position calculation
  const updatePosition = useCallback(() => {
    if (!showWalkthrough || overlayPaused) return;
    
    const selector = isQuickTour && activeItem ? activeItem.selector : step?.targetSelector;
    if (!selector || selector === "body") {
      setCutoutRect(null);
      return;
    }

    const el = document.querySelector(selector);
    if (!el) {
      setCutoutRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setCutoutRect(rect);

    const pos = step?.position || "right";
    const tooltipW = 360;
    const tooltipH = 220;
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
  }, [showWalkthrough, overlayPaused, step, isQuickTour, activeItem]);

  useEffect(() => {
    if (!showWalkthrough || overlayPaused) return;
    const timer = setTimeout(updatePosition, 200);
    window.addEventListener("resize", updatePosition);
    return () => { clearTimeout(timer); window.removeEventListener("resize", updatePosition); };
  }, [showWalkthrough, overlayPaused, currentStep, quickTourIndex, location.pathname, updatePosition]);

  // Reset quick tour index when entering step 8
  useEffect(() => {
    if (currentStep === 8) setQuickTourIndex(0);
  }, [currentStep]);

  if (!showWalkthrough || overlayPaused) return null;
  if (currentStep === 0) return null; // WelcomeModal handles step 0

  // Completion modal
  if (showCompletion || currentStep >= 9) {
    return <CompletionModal onClose={() => { setShowCompletion(false); skipTutorial(); }} />;
  }

  if (!step && !isQuickTour) return null;

  const title = isQuickTour && activeItem ? activeItem.title : step.title;
  const description = isQuickTour && activeItem ? activeItem.desc : step.description;
  const isClickTarget = !isQuickTour && step.action === "click_target";

  const handleAction = () => {
    if (isQuickTour) {
      if (quickTourIndex < QUICK_TOUR_ITEMS.length - 1) {
        setQuickTourIndex(quickTourIndex + 1);
      } else {
        advanceStep(); // move past step 8
      }
      return;
    }
    if (step.action === "click_target" && step.navigateTo) {
      navigate(step.navigateTo);
      advanceStep();
    } else {
      advanceStep();
    }
  };

  const handleTargetClick = () => {
    if (!isClickTarget) return;
    const selector = step.targetSelector;
    const el = document.querySelector(selector) as HTMLElement;
    if (el) el.click();
    if (step.navigateTo) navigate(step.navigateTo);
    advanceStep();
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;
  const clipPath = cutoutRect
    ? `polygon(0% 0%, 0% 100%, ${cutoutRect.left - 8}px 100%, ${cutoutRect.left - 8}px ${cutoutRect.top - 8}px, ${cutoutRect.right + 8}px ${cutoutRect.top - 8}px, ${cutoutRect.right + 8}px ${cutoutRect.bottom + 8}px, ${cutoutRect.left - 8}px ${cutoutRect.bottom + 8}px, ${cutoutRect.left - 8}px 100%, 100% 100%, 100% 0%)`
    : undefined;

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60"
        style={{
          clipPath,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Clickable target area (only for click_target steps) */}
      {isClickTarget && cutoutRect && (
        <div
          className="fixed z-[9999] cursor-pointer rounded-lg ring-2 ring-primary ring-offset-2 animate-pulse"
          style={{
            top: cutoutRect.top - 8,
            left: cutoutRect.left - 8,
            width: cutoutRect.width + 16,
            height: cutoutRect.height + 16,
            pointerEvents: "auto",
          }}
          onClick={handleTargetClick}
        />
      )}

      {/* Block clicks outside target */}
      {isClickTarget && (
        <>
          {cutoutRect && (
            <>
              <div className="fixed z-[9997]" style={{ top: 0, left: 0, right: 0, height: Math.max(0, cutoutRect.top - 8), pointerEvents: "auto" }} />
              <div className="fixed z-[9997]" style={{ top: cutoutRect.bottom + 8, left: 0, right: 0, bottom: 0, pointerEvents: "auto" }} />
              <div className="fixed z-[9997]" style={{ top: cutoutRect.top - 8, left: 0, width: Math.max(0, cutoutRect.left - 8), height: cutoutRect.height + 16, pointerEvents: "auto" }} />
              <div className="fixed z-[9997]" style={{ top: cutoutRect.top - 8, left: cutoutRect.right + 8, right: 0, height: cutoutRect.height + 16, pointerEvents: "auto" }} />
            </>
          )}
        </>
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[10000] w-[360px] bg-card border rounded-xl shadow-2xl p-5 animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ top: tooltipPos.top, left: tooltipPos.left, pointerEvents: "auto" }}
      >
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">{description}</p>
        {isClickTarget ? (
          <p className="text-xs text-muted-foreground italic">👆 Click the highlighted element to continue</p>
        ) : (
          <Button onClick={handleAction} size="sm" className="w-full">
            {isQuickTour ? (quickTourIndex < QUICK_TOUR_ITEMS.length - 1 ? "Next →" : "Finish Tour →") : (step.buttonText || "Next →")}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Bottom progress bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-slate-900/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between" style={{ pointerEvents: "auto" }}>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 < currentStep ? "bg-primary" :
                i + 1 === currentStep ? "bg-white" : "bg-slate-600"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400">Step {currentStep} of {TOTAL_STEPS}</span>
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Skip walkthrough
        </button>
      </div>

      {/* Skip confirmation */}
      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent className="z-[10001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Skip the walkthrough?</AlertDialogTitle>
            <AlertDialogDescription>
              You can restart it anytime from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Tutorial</AlertDialogCancel>
            <AlertDialogAction onClick={skipTutorial}>Skip</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CompletionModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" style={{ pointerEvents: "auto" }}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center animate-in fade-in-0 zoom-in-95">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You're ready to go!</h2>
        <p className="text-muted-foreground mb-6">
          Your AI agent is built and tested. Here's what to do next to start making real calls:
        </p>

        <div className="text-left space-y-4 mb-8">
          {[
            { icon: "📋", title: "Upload contacts", desc: "Contact Lists → Upload CSV", path: "/contacts" },
            { icon: "📞", title: "Import a phone number", desc: "Phone Numbers → Add Number", path: "/phone-numbers" },
            { icon: "🚀", title: "Launch your first campaign", desc: "Campaigns → Create", path: "/campaigns" },
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
          You'll see a checklist in the corner until you're fully set up.
        </p>

        <Button className="w-full" onClick={() => { onClose(); navigate("/"); }}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
