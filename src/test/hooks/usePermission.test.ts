import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { usePermission, useRole, useTeamLimit, PLAN_TEAM_LIMITS } from "@/hooks/use-permission";

// Mock the AuthContext so we can control the user's role/plan
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

function setRole(role: string, plan = "voice_ai_starter") {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: { role, tenant: { plan } },
  });
}

function setNoUser() {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
}

describe("useRole", () => {
  it("returns the user role when logged in", () => {
    setRole("admin");
    const { result } = renderHook(() => useRole());
    expect(result.current).toBe("admin");
  });

  it("returns 'viewer' when there is no user", () => {
    setNoUser();
    const { result } = renderHook(() => useRole());
    expect(result.current).toBe("viewer");
  });
});

describe("usePermission", () => {
  it("grants owner access to billing.change", () => {
    setRole("owner");
    const { result } = renderHook(() => usePermission("billing.change"));
    expect(result.current).toBe(true);
  });

  it("denies admin access to billing.change", () => {
    setRole("admin");
    const { result } = renderHook(() => usePermission("billing.change"));
    expect(result.current).toBe(false);
  });

  it("grants manager access to campaigns.create", () => {
    setRole("manager");
    const { result } = renderHook(() => usePermission("campaigns.create"));
    expect(result.current).toBe(true);
  });

  it("denies viewer access to campaigns.create", () => {
    setRole("viewer");
    const { result } = renderHook(() => usePermission("campaigns.create"));
    expect(result.current).toBe(false);
  });

  it("grants admin access to agents.delete", () => {
    setRole("admin");
    const { result } = renderHook(() => usePermission("agents.delete"));
    expect(result.current).toBe(true);
  });

  it("denies manager access to agents.delete", () => {
    setRole("manager");
    const { result } = renderHook(() => usePermission("agents.delete"));
    expect(result.current).toBe(false);
  });

  it("returns false for unknown permissions", () => {
    setRole("owner");
    const { result } = renderHook(() => usePermission("does.not.exist"));
    expect(result.current).toBe(false);
  });

  it("returns false for a null user", () => {
    setNoUser();
    const { result } = renderHook(() => usePermission("agents.create"));
    expect(result.current).toBe(false);
  });
});

describe("useTeamLimit", () => {
  it("returns limit 1 for starter plan", () => {
    setRole("owner", "voice_ai_starter");
    const { result } = renderHook(() => useTeamLimit());
    expect(result.current.limit).toBe(PLAN_TEAM_LIMITS.voice_ai_starter);
  });

  it("returns limit 3 for pro plan", () => {
    setRole("owner", "voice_ai_pro");
    const { result } = renderHook(() => useTeamLimit());
    expect(result.current.limit).toBe(PLAN_TEAM_LIMITS.voice_ai_pro);
  });

  it("returns limit 10 for enterprise plan", () => {
    setRole("owner", "voice_ai_enterprise");
    const { result } = renderHook(() => useTeamLimit());
    expect(result.current.limit).toBe(PLAN_TEAM_LIMITS.voice_ai_enterprise);
  });

  it("falls back to starter limit for unknown plan", () => {
    setRole("owner", "unknown_plan");
    const { result } = renderHook(() => useTeamLimit());
    expect(result.current.limit).toBe(1);
  });

  it("falls back to starter limit when there is no user", () => {
    setNoUser();
    const { result } = renderHook(() => useTeamLimit());
    expect(result.current.limit).toBe(PLAN_TEAM_LIMITS.voice_ai_starter);
  });
});
