import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useIsMobile } from "@/hooks/use-mobile";

const MOBILE_BREAKPOINT = 768;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

describe("useIsMobile", () => {
  let changeHandler: (() => void) | null = null;

  beforeEach(() => {
    changeHandler = null;
    // Override setup.ts matchMedia to capture the change listener and control matches
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: window.innerWidth < MOBILE_BREAKPOINT,
        media: query,
        onchange: null,
        addEventListener: (_: string, handler: () => void) => { changeHandler = handler; },
        removeEventListener: () => { changeHandler = null; },
        dispatchEvent: () => {},
      }),
    });
  });

  it("returns false on a desktop viewport", () => {
    setViewportWidth(1280);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true on a mobile viewport", () => {
    setViewportWidth(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false exactly at the breakpoint boundary (768px)", () => {
    setViewportWidth(MOBILE_BREAKPOINT);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true one pixel below the breakpoint (767px)", () => {
    setViewportWidth(MOBILE_BREAKPOINT - 1);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when the viewport resizes from desktop to mobile", () => {
    setViewportWidth(1280);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setViewportWidth(375);
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });

  it("updates when the viewport resizes from mobile to desktop", () => {
    setViewportWidth(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => {
      setViewportWidth(1280);
      changeHandler?.();
    });

    expect(result.current).toBe(false);
  });
});
