import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Overview from "./pages/Overview";
import LandingPage from "./pages/LandingPage";
import AgentBuilder from "./pages/AgentBuilder";
import AgentEditor from "./pages/AgentEditor";
import Campaigns from "./pages/Campaigns";
import CampaignWizard from "./pages/CampaignWizard";
import CampaignDetail from "./pages/CampaignDetail";
import ContactLists from "./pages/ContactLists";
import CallLogs from "./pages/CallLogs";
import Analytics from "./pages/Analytics";
import PhoneNumbers from "./pages/PhoneNumbers";
import Settings from "./pages/Settings";
import Tools from "./pages/Tools";
import BillingUsage from "./pages/BillingUsage";
import KnowledgeBase from "./pages/KnowledgeBase";
import Team from "./pages/Team";
import CoachingDashboard from "./pages/CoachingDashboard";
import Voices from "./pages/Voices";
import Training from "./pages/Training";
import Forge from "./pages/Forge";
import Leads from "./pages/Leads";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import CookiesPolicy from "./pages/CookiesPolicy";
import ApiDocs from "./pages/ApiDocs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              {/* Public routes */}
              <Route path="/welcome" element={<LandingPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/cookies" element={<CookiesPolicy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<ErrorBoundary><Overview /></ErrorBoundary>} />
                  <Route path="/forge" element={<ErrorBoundary><Forge /></ErrorBoundary>} />
                  <Route path="/agents" element={<ErrorBoundary><AgentBuilder /></ErrorBoundary>} />
                  <Route path="/agents/:id" element={<ErrorBoundary><AgentEditor /></ErrorBoundary>} />
                  <Route path="/voices" element={<ErrorBoundary><Voices /></ErrorBoundary>} />
                  <Route path="/knowledge-base" element={<ErrorBoundary><KnowledgeBase /></ErrorBoundary>} />
                  <Route path="/tools" element={<ErrorBoundary><Tools /></ErrorBoundary>} />
                  <Route path="/campaigns" element={<ErrorBoundary><Campaigns /></ErrorBoundary>} />
                  <Route path="/campaigns/new" element={<ErrorBoundary><CampaignWizard /></ErrorBoundary>} />
                  <Route path="/campaigns/:id" element={<ErrorBoundary><CampaignDetail /></ErrorBoundary>} />
                  <Route path="/contacts" element={<ErrorBoundary><ContactLists /></ErrorBoundary>} />
                  <Route path="/leads" element={<ErrorBoundary><Leads /></ErrorBoundary>} />
                  <Route path="/call-logs" element={<ErrorBoundary><CallLogs /></ErrorBoundary>} />
                  <Route path="/coaching" element={<ErrorBoundary><CoachingDashboard /></ErrorBoundary>} />
                  <Route path="/training" element={<ErrorBoundary><Training /></ErrorBoundary>} />
                  <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                  <Route path="/phone-numbers" element={<ErrorBoundary><PhoneNumbers /></ErrorBoundary>} />
                  <Route path="/billing" element={<ErrorBoundary><BillingUsage /></ErrorBoundary>} />
                  <Route path="/team" element={<ErrorBoundary><Team /></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                  <Route path="/api-docs" element={<ErrorBoundary><ApiDocs /></ErrorBoundary>} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
