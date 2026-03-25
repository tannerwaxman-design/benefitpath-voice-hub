import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export interface OnboardingChecklist {
  agent_created: boolean;
  test_call_made: boolean;
  voice_selected: boolean;
  contacts_uploaded: boolean;
  phone_imported: boolean;
}

interface TutorialContextType {
  showWelcome: boolean;
  showTutorial: boolean;
  currentStep: number;
  checklist: OnboardingChecklist;
  checklistDismissed: boolean;
  tutorialCompleted: boolean;
  startTutorial: (mode: "manual" | "forge" | "skip") => void;
  advanceStep: () => void;
  goToStep: (step: number) => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  dismissChecklist: () => void;
  updateChecklist: (key: keyof OnboardingChecklist) => void;
  closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  showWelcome: false,
  showTutorial: false,
  currentStep: 0,
  checklist: { agent_created: false, test_call_made: false, voice_selected: false, contacts_uploaded: false, phone_imported: false },
  checklistDismissed: false,
  tutorialCompleted: true,
  startTutorial: () => {},
  advanceStep: () => {},
  goToStep: () => {},
  skipTutorial: () => {},
  restartTutorial: () => {},
  dismissChecklist: () => {},
  updateChecklist: () => {},
  closeTutorial: () => {},
});

export const useTutorial = () => useContext(TutorialContext);

const TOTAL_STEPS = 7;

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checklist, setChecklist] = useState<OnboardingChecklist>({
    agent_created: false,
    test_call_made: false,
    voice_selected: false,
    contacts_uploaded: false,
    phone_imported: false,
  });
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load tutorial state from tenant
  useEffect(() => {
    if (!user?.tenant) return;
    const tenant = user.tenant;
    const onboardingStep = tenant.onboarding_step ?? 0;
    const onboardingChecklist = (tenant.onboarding_checklist ?? checklist) as OnboardingChecklist;
    const dismissed = tenant.onboarding_checklist_dismissed ?? false;
    const completed = tenant.onboarding_completed ?? false;

    setChecklist(onboardingChecklist);
    setChecklistDismissed(dismissed);
    setTutorialCompleted(completed);

    if (!initialized) {
      if (!completed && onboardingStep > 0) {
        // Resume from where they left off
        setCurrentStep(onboardingStep);
        setShowTutorial(true);
      } else if (!completed && onboardingStep === 0) {
        // First time — show welcome modal
        setShowWelcome(true);
      }
      setInitialized(true);
    }
  }, [user?.tenant, initialized]);

  // Listen for restart event from Settings page
  useEffect(() => {
    const handler = () => {
      if (user?.tenant_id) {
        supabase
          .from("tenants")
          .update({ onboarding_completed: false, onboarding_step: 0 } as any)
          .eq("id", user.tenant_id)
          .then(() => refreshProfile());
        setTutorialCompleted(false);
        setCurrentStep(0);
        setShowWelcome(true);
        setShowTutorial(false);
        setInitialized(false);
      }
    };
    window.addEventListener("restart-tutorial", handler);
    return () => window.removeEventListener("restart-tutorial", handler);
  }, [user?.tenant_id, refreshProfile]);

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
      .update({ onboarding_completed: true, onboarding_step: TOTAL_STEPS } as any)
      .eq("id", user.tenant_id);
    await refreshProfile();
  }, [user?.tenant_id, refreshProfile]);

  const startTutorial = useCallback((mode: "manual" | "forge" | "skip") => {
    setShowWelcome(false);
    if (mode === "skip") {
      setTutorialCompleted(true);
      persistCompletion();
      return;
    }
    if (mode === "forge") {
      // Navigate to forge, tutorial will resume at step 5 after agent creation
      setCurrentStep(5);
      setShowTutorial(false);
      persistStep(5);
      // Navigation is handled by the component
      return;
    }
    // manual mode
    setCurrentStep(1);
    setShowTutorial(true);
    persistStep(1);
  }, [persistCompletion, persistStep]);

  const advanceStep = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep > TOTAL_STEPS) {
      setShowTutorial(false);
      setTutorialCompleted(true);
      persistCompletion();
      return;
    }
    setCurrentStep(nextStep);
    persistStep(nextStep);
  }, [currentStep, persistCompletion, persistStep]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setShowTutorial(true);
    persistStep(step);
  }, [persistStep]);

  const skipTutorial = useCallback(() => {
    setShowTutorial(false);
    setShowWelcome(false);
    setTutorialCompleted(true);
    persistCompletion();
  }, [persistCompletion]);

  const restartTutorial = useCallback(async () => {
    if (!user?.tenant_id) return;
    await supabase
      .from("tenants")
      .update({ onboarding_completed: false, onboarding_step: 0 } as any)
      .eq("id", user.tenant_id);
    await refreshProfile();
    setTutorialCompleted(false);
    setCurrentStep(0);
    setShowWelcome(true);
    setShowTutorial(false);
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

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        showWelcome,
        showTutorial,
        currentStep,
        checklist,
        checklistDismissed,
        tutorialCompleted,
        startTutorial,
        advanceStep,
        goToStep,
        skipTutorial,
        restartTutorial,
        dismissChecklist,
        updateChecklist,
        closeTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}
