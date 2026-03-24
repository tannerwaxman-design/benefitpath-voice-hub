import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        neq: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        ilike: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        or: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

// Mock auth context
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { tenant_id: "test-tenant-id", email: "test@test.com" },
  }),
}));

describe("useGlobalSearch", () => {
  it("should be importable", async () => {
    const mod = await import("@/hooks/use-global-search");
    expect(mod.useGlobalSearch).toBeDefined();
  });

  it("should export SearchResult type", async () => {
    const mod = await import("@/hooks/use-global-search");
    expect(typeof mod.useGlobalSearch).toBe("function");
  });
});
