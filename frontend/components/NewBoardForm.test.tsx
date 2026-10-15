import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewBoardForm from "./NewBoardForm";

afterEach(cleanup);

function renderForm(open: boolean) {
  const onOpen = vi.fn();
  const onClose = vi.fn();
  const onCreate = vi.fn(async () => true);
  render(
    <NewBoardForm
      onCreate={onCreate}
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      before={<button type="button">+ New task</button>}
    />
  );
  return { onOpen, onClose, onCreate };
}

describe("NewBoardForm", () => {
  it("shows '+ New board' when closed and asks the parent to open it", () => {
    const { onOpen } = renderForm(false);
    fireEvent.click(screen.getByRole("button", { name: "+ New board" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("New board name")).toBeNull();
  });

  it("puts Cancel in the row where '+ New board' was, and shows the name field", () => {
    const { onClose } = renderForm(true);
    const row = document.querySelector(".board-bar") as HTMLElement;
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(row.contains(cancel)).toBe(true);
    expect(screen.queryByRole("button", { name: "+ New board" })).toBeNull();
    expect(screen.getByLabelText("New board name")).toBeTruthy();

    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the task toggle beside it in the same row", () => {
    renderForm(true);
    const row = document.querySelector(".board-bar") as HTMLElement;
    expect(row.contains(screen.getByRole("button", { name: "+ New task" }))).toBe(true);
  });

  it("creates a board and closes when the name is submitted", async () => {
    const { onCreate, onClose } = renderForm(true);
    fireEvent.change(screen.getByLabelText("New board name"), { target: { value: "  Work  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create board" }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith("Work");
  });
});
