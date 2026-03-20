import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders dialog content when open", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Agent"
        description="This action cannot be undone."
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Delete Agent")).toBeDefined();
    expect(screen.getByText("This action cannot be undone.")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Delete Agent"
        description="This action cannot be undone."
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByText("Delete Agent")).toBeNull();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Agent"
        description="Confirm?"
        confirmLabel="Yes, Delete"
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByText("Yes, Delete"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
