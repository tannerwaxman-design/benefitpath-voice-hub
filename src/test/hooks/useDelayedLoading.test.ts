import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useDelayedLoading } from "@/hooks/use-delayed-loading";

describe("useDelayedLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false immediately when not loading", () => {
    const { result } = renderHook(() => useDelayedLoading(false));
    expect(result.current).toBe(false);
  });

  it("returns false before the delay elapses", () => {
    const { result } = renderHook(() => useDelayedLoading(true, 300));
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe(false);
  });

  it("returns true after the delay elapses", () => {
    const { result } = renderHook(() => useDelayedLoading(true, 300));
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(true);
  });

  it("returns false immediately when loading stops before the delay", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, 300),
      { initialProps: { loading: true } }
    );
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it("resets to false when loading transitions from true to false after delay", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, 300),
      { initialProps: { loading: true } }
    );
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(true);
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it("uses the default delay of 300ms", () => {
    const { result } = renderHook(() => useDelayedLoading(true));
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
  });

  it("respects a custom delay", () => {
    const { result } = renderHook(() => useDelayedLoading(true, 1000));
    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
  });
});
