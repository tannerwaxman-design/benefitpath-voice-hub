import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

describe("Breadcrumbs", () => {
  it("does not render on root page", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    expect(container.querySelector("nav")).toBeNull();
  });

  it("does not render on single-segment pages", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/agents"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders breadcrumbs for nested pages", () => {
    render(
      <MemoryRouter initialEntries={["/agents/some-id"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    expect(screen.getByText("Agents")).toBeDefined();
  });

  it("renders breadcrumbs for campaign detail", () => {
    render(
      <MemoryRouter initialEntries={["/campaigns/new"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    expect(screen.getByText("Campaigns")).toBeDefined();
    expect(screen.getByText("New")).toBeDefined();
  });
});
