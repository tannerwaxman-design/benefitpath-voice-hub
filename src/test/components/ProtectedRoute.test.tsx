import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

function setup(authState: ReturnType<typeof useAuth>, initialPath = "/dashboard") {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/welcome" element={<div>Landing page</div>} />
        <Route path="/onboarding" element={<div>Onboarding page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/settings" element={<div>Settings</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

const completedTenant = {
  id: "t1",
  company_name: "Acme",
  plan: "voice_ai_pro",
  onboarding_completed: true,
  monthly_minute_limit: 1000,
  minutes_used_this_cycle: 0,
  credit_balance: 100,
  industry: "insurance",
  status: "active",
  default_timezone: "UTC",
  overage_rate_per_minute: 0.1,
  billing_cycle_start: "2025-01-01",
  billing_cycle_end: "2025-02-01",
  hard_stop_enabled: false,
  auto_refill_enabled: false,
  auto_refill_threshold: 0,
  auto_refill_package: "",
};

const baseUser = {
  id: "u1",
  email: "user@test.com",
  tenant_id: "t1",
  role: "owner",
  tenant: completedTenant,
};

describe("ProtectedRoute", () => {
  it("shows a spinner while auth is loading", () => {
    setup({ session: null, user: null, loading: true } as any);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("redirects unauthenticated users to /welcome", () => {
    setup({ session: null, user: null, loading: false } as any);
    expect(screen.getByText("Landing page")).toBeInTheDocument();
  });

  it("renders the protected page for authenticated users with completed onboarding", () => {
    setup({
      session: { access_token: "tok" } as any,
      user: baseUser,
      loading: false,
    } as any);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("redirects to /onboarding when onboarding is not completed", () => {
    setup({
      session: { access_token: "tok" } as any,
      user: {
        ...baseUser,
        tenant: { ...completedTenant, onboarding_completed: false },
      },
      loading: false,
    } as any);
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("does not redirect to onboarding when already on /onboarding", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      session: { access_token: "tok" } as any,
      user: {
        ...baseUser,
        tenant: { ...completedTenant, onboarding_completed: false },
      },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<div>Onboarding page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("allows navigation between protected pages without re-redirecting", () => {
    setup(
      {
        session: { access_token: "tok" } as any,
        user: baseUser,
        loading: false,
      } as any,
      "/settings"
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
