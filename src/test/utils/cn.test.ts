import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("handles conditional objects", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("merges conflicting Tailwind classes (last wins)", () => {
    // twMerge should resolve p-2 vs p-4 → p-4
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("merges conflicting text colour utilities", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("returns an empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles mixed inputs", () => {
    const active = true;
    const result = cn("base", active && "active", { disabled: false });
    expect(result).toBe("base active");
  });
});
