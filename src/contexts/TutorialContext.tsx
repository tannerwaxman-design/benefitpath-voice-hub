import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface OnboardingChecklist {
  agent_created: boolean;
  test_call_made: boolean;
  voice_selected: boolean;
  contacts_uploaded: boolean;
  phone_imported: boolean;
}

interface TutorialContextType {
  showWalkthrough: boolean;
  currentStep: number;
  checklist: OnboardingChecklist;
  checklistDismissed: boolean;
  tutorialCompleted: boolean;
  advanceStep: () => void;
  goToStep: (step: number) => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  dismissChecklist: () => void;
  updateChecklist: (key: keyof OnboardingChecklist) => void;
  pauseOverlay: () => void;
  resumeOverlay: () => void;
  overlayPaused: boolean;
}

const TutorialContext = createContext<TutorialContextType>({
  showWalkthrough: false,
  currentStep: 0,
  checklist: { agent_created: false, test_call_made: false, voice_selected: false, contacts_uploaded: false, phone_imported: false },
  checklistDismissed: false,
  tutorialCompleted: true,
  advanceStep: () => {},
  goToStep: () => {},
  skipTutorial: () => {},
  restartTutorial: () => {},
  dismissChecklist: () => {},
  updateChecklist: () => {},
  pauseOverlay: () => {},
  resumeOverlay: () => {},
  overlayPaused: false,
});

export const useTutorial = () => useContext(TutorialContext);

const TOTAL_STEPS = 10;

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checklist, setChecklist] = useState<OnboardingChecklist>({
    agent_created: false, test_call_made: false, voice_selected: false,
    contacts_uploaded: false, phone_imported: false,
  });
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [overlayPaused, setOverlayPaused] = useState(false);

  useEffect(() => {
    if (!user?.tenant) return;
    const tenant = user.tenant;
    if (!tenant.onboarding_completed) return;

    const step = tenant.onboarding_step ?? 0;
    const cl = (tenant.onboarding_checklist ?? checklist) as OnboardingChecklist;
    const dismissed = tenant.onboarding_checklist_dismissed ?? false;
    const completed = tenant.tutorial_completed ?? false;

    setChecklist(cl);
    setChecklistDismissed(dismissed);
    setTutorialCompleted(completed);

    if (!initialized) {
      if (!completed) {
        setCurrentStep(step);
        setShowWalkthrough(true);
        // If resuming at step 5 (forge conversation), pause overlay
        if (step === 5) setOverlayPaused(true);
      }
      setInitialized(true);
    }
  }, [user?.tenant, initialized]);

  // Listen for restart event
  useEffect(() => {
    const handler = () => {
      if (user?.tenant_id) {
        supabase
          .from("tenants")
          .update({ tutorial_completed: false, onboarding_step: 0 } as any)
          .eq("id", user.tenant_id)
          .then(() => refreshProfile());
        setTutorialCompleted(false);
        setCurrentStep(0);
        setShowWalkthrough(true);
        setOverlayPaused(false);
        setInitialized(false);
      }
    };
    window.addEventListener("restart-tutorial", handler);
    return () => window.removeEventListener("restart-tutorial", handler);
  }, [user?.tenant_id, refreshProfile]);

  // Listen for forge agent created event
  useEffect(() => {
    const handler = () => {
      if (currentStep === 5 && showWalkthrough) {
        setOverlayPaused(false);
        setCurrentStep(6);
        persistStep(6);
      }
    };
    window.addEventListener("agent_created_via_forge", handler);
    return () => window.removeEventListener("agent_created_via_forge", handler);
  }, [currentStep, showWalkthrough]);

  const persistStep = useCallback(async (step: number) => {
    if (!user?.tenant_id) return;
    await supabase
      .from("tenants")
      .update({ onboarding_step: step } as any)
      .eq("id", user.tenant_id);
  }, [user?.tenant_id]);

  const persistCompletion = useCallback(async () => {
    if (!user?.tenant_id) return;
    await supabase
      .from("tenants")
      .update({ tutorial_completed: true, onboarding_step: TOTAL_STEPS } as any)
      .eq("id", user.tenant_id);
    await refreshProfile();
  }, [user?.tenant_id, refreshProfile]);

  const advanceStep = useCallback(() => {
    const next = currentStep + 1;
    if (next > TOTAL_STEPS) {
      setShowWalkthrough(false);
      setTutorialCompleted(true);
      persistCompletion();
      return;
    }
    // Step 5 is the Forge conversation — pause overlay
    if (next === 5) setOverlayPaused(true);
    else setOverlayPaused(false);
    setCurrentStep(next);
    persistStep(next);
  }, [currentStep, persistCompletion, persistStep]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setShowWalkthrough(true);
    if (step === 5) setOverlayPaused(true);
    else setOverlayPaused(false);
    persistStep(step);
  }, [persistStep]);

  const skipTutorial = useCallback(() => {
    setShowWalkthrough(false);
    setTutorialCompleted(true);
    setOverlayPaused(false);
    persistCompletion();
  }, [persistCompletion]);

  const restartTutorial = useCallback(async () => {
    if (!user?.tenant_id) return;
    await supabase
      .from("tenants")
      .update({ tutorial_completed: false, onboarding_step: 0 } as any)
      .eq("id", user.tenant_id);
    await refreshProfile();
    setTutorialCompleted(false);
    setCurrentStep(0);
    setShowWalkthrough(true);
    setOverlayPaused(false);
    setInitialized(false);
  }, [user?.tenant_id, refreshProfile]);

  const dismissChecklist = useCallback(async () => {
    setChecklistDismissed(true);
    if (!user?.tenant_id) return;
    await supabase
      .from("tenants")
      .update({ onboarding_checklist_dismissed: true } as any)
      .eq("id", user.tenant_id);
  }, [user?.tenant_id]);

  const updateChecklist = useCallback(async (key: keyof OnboardingChecklist) => {
    const updated = { ...checklist, [key]: true };
    setChecklist(updated);
    if (!user?.tenant_id) return;
    await supabase
      .from("tenants")
      .update({ onboarding_checklist: updated } as any)
      .eq("id", user.tenant_id);
  }, [checklist, user?.tenant_id]);

  const pauseOverlay = useCallback(() => setOverlayPaused(true), []);
  const resumeOverlay = useCallback(() => setOverlayPaused(false), []);

  return (
    <TutorialContext.Provider value={{
      showWalkthrough, currentStep, checklist, checklistDismissed, tutorialCompleted,
      advanceStep, goToStep, skipTutorial, restartTutorial, dismissChecklist,
      updateChecklist, pauseOverlay, resumeOverlay, overlayPaused,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}
