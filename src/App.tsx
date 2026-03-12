import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Overview from "./pages/Overview";
import AgentBuilder from "./pages/AgentBuilder";
import AgentEditor from "./pages/AgentEditor";
import Campaigns from "./pages/Campaigns";
import CampaignWizard from "./pages/CampaignWizard";
import ContactLists from "./pages/ContactLists";
import CallLogs from "./pages/CallLogs";
import Analytics from "./pages/Analytics";
import PhoneNumbers from "./pages/PhoneNumbers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/agents" element={<AgentBuilder />} />
              <Route path="/agents/:id" element={<AgentEditor />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/new" element={<CampaignWizard />} />
              <Route path="/campaigns/:id" element={<Campaigns />} />
              <Route path="/contacts" element={<ContactLists />} />
              <Route path="/call-logs" element={<CallLogs />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/phone-numbers" element={<PhoneNumbers />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
