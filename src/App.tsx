import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import Login from "./pages/Login";
import Forge from "./pages/Forge";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import CookiesPolicy from "./pages/CookiesPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
                <Route path="/" element={<Overview />} />
                <Route path="/forge" element={<Forge />} />
                <Route path="/agents" element={<AgentBuilder />} />
                <Route path="/agents/:id" element={<AgentEditor />} />
                <Route path="/voices" element={<Voices />} />
                <Route path="/knowledge-base" element={<KnowledgeBase />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/new" element={<CampaignWizard />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/contacts" element={<ContactLists />} />
                <Route path="/call-logs" element={<CallLogs />} />
                <Route path="/coaching" element={<CoachingDashboard />} />
                <Route path="/training" element={<Training />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/phone-numbers" element={<PhoneNumbers />} />
                <Route path="/billing" element={<BillingUsage />} />
                <Route path="/team" element={<Team />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
