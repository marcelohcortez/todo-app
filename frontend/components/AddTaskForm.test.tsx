import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddTaskForm from "./AddTaskForm";

afterEach(cleanup);

function renderForm(busy: boolean) {
  render(
    <AddTaskForm
      variant="sheet"
      title="Buy milk"
      onTitleChange={vi.fn()}
      priority="normal"
      onPriorityChange={vi.fn()}
      boards={[]}
      boardId=""
      onBoardChange={vi.fn()}
      newBoardName=""
      onNewBoardNameChange={vi.fn()}
      onSubmit={vi.fn()}
      onError={vi.fn()}
      busy={busy}
    />
  );
}

describe("AddTaskForm", () => {
  it("enables the Add button and shows its text when not busy", () => {
    renderForm(false);
    const button = screen.getByRole("button", { name: "Add" });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("disables the Add button and shows a spinner while busy", () => {
    renderForm(true);
    const button = screen.getByRole("button", { name: "Adding task" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status", { name: "Adding task" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
  });
});
