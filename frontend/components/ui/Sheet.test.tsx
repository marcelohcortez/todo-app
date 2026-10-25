import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sheet from "./Sheet";

afterEach(() => cleanup());

describe("Sheet", () => {
  it("focuses the first focusable element inside on open (the Cancel button, before the content)", async () => {
    render(
      <Sheet label="Example" title="Example" onClose={() => {}}>
        <input aria-label="Name" />
      </Sheet>
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("wraps Tab from the last focusable item back to the first, and Shift+Tab back the other way", () => {
    render(
      <Sheet label="Example" title="Example" onClose={() => {}}>
        <input aria-label="Name" />
      </Sheet>
    );
    const input = screen.getByLabelText("Name");
    const cancel = screen.getByRole("button", { name: "Cancel" });

    // input is the last focusable item; Tab from it wraps to the first (Cancel).
    input.focus();
    fireEvent.keyDown(input, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);

    // Cancel is the first; Shift+Tab from it wraps to the last (input).
    fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(input);
  });

  it("restores focus to the trigger on close", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const onClose = vi.fn();
    const { unmount } = render(
      <Sheet label="Example" title="Example" onClose={onClose}>
        <input aria-label="Name" />
      </Sheet>
    );
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
