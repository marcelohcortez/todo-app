import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OptionsMenu from "./OptionsMenu";

afterEach(cleanup);

function renderMenu(variant: "dropdown" | "sheet", isAdmin: boolean) {
  const handlers = { onClose: vi.fn(), onAddUser: vi.fn(), onFriends: vi.fn(), onShared: vi.fn(), onLogout: vi.fn() };
  render(<OptionsMenu variant={variant} isAdmin={isAdmin} {...handlers} />);
  return handlers;
}

describe.each(["dropdown", "sheet"] as const)("OptionsMenu (%s)", (variant) => {
  it("shows Settings, Friends and Log out to everyone", () => {
    renderMenu(variant, false);
    expect(screen.getByText("Settings").closest("a")?.getAttribute("href")).toBe("/settings");
    expect(screen.getByText("Friends")).toBeTruthy();
    expect(screen.getByText("Log out")).toBeTruthy();
  });

  it("calls onFriends when Friends is pressed", () => {
    const { onFriends } = renderMenu(variant, false);
    fireEvent.click(screen.getByText("Friends"));
    expect(onFriends).toHaveBeenCalledTimes(1);
  });

  it("does not show Add user to a non-admin", () => {
    renderMenu(variant, false);
    expect(screen.queryByText("Add user")).toBeNull();
  });

  it("shows Add user to the admin and calls onAddUser", () => {
    const { onAddUser } = renderMenu(variant, true);
    fireEvent.click(screen.getByText("Add user"));
    expect(onAddUser).toHaveBeenCalledTimes(1);
  });

  it("calls onLogout when Log out is pressed", () => {
    const { onLogout } = renderMenu(variant, false);
    fireEvent.click(screen.getByText("Log out"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

describe("OptionsMenu dropdown", () => {
  it("closes when the page behind it is clicked", () => {
    const { onClose } = renderMenu("dropdown", false);
    fireEvent.click(document.querySelector(".options-scrim") as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not show Shared, since desktop already has a Shared tab", () => {
    renderMenu("dropdown", false);
    expect(screen.queryByText("Shared")).toBeNull();
  });
});

describe("OptionsMenu sheet", () => {
  it("shows Shared and calls onShared", () => {
    const { onShared } = renderMenu("sheet", false);
    fireEvent.click(screen.getByText("Shared"));
    expect(onShared).toHaveBeenCalledTimes(1);
  });
});
