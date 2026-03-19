import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCountUp } from "@/hooks/use-count-up";

describe("useCountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at 0", () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(0);
  });

  it("stays at 0 when target is 0", () => {
    const { result } = renderHook(() => useCountUp(0));
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(0);
  });

  it("reaches the target value after the duration", () => {
    const { result } = renderHook(() => useCountUp(100, 400));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(100);
  });

  it("is partway through at the midpoint", () => {
    const { result } = renderHook(() => useCountUp(100, 400));
    act(() => { vi.advanceTimersByTime(200); });
    // Eased progress at 50% is noticeably above 0 and below 100
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  it("handles large target values", () => {
    const { result } = renderHook(() => useCountUp(1_000_000, 400));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(1_000_000);
  });

  it("resets and re-animates when target changes", () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 400), {
      initialProps: { target: 50 },
    });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(50);

    rerender({ target: 0 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(0);
  });
});
