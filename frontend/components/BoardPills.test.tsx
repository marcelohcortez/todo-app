import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BoardPills, { ALL } from "./BoardPills";
import type { Board } from "@/lib/types";

afterEach(cleanup);

const counts = { taskCount: 0, activeCount: 0, doneCount: 0 };
const boards: Board[] = [
  { id: "b1", name: "Work", createdAt: "2026-10-01T10:00:00.000Z", ...counts },
  { id: "b2", name: "Home", createdAt: "2026-10-02T10:00:00.000Z", ...counts },
];

function renderPills() {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const onRename = vi.fn();
  render(
    <BoardPills boards={boards} value={ALL} onChange={onChange} onRemove={onRemove} onRename={onRename} />
  );
  return { onChange, onRemove, onRename };
}

// Turns the name of the pill for "Work" into the editable text and types a new name into it.
function startRename(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Rename board Work" }));
  const field = screen.getByRole("textbox", { name: "Rename board Work" });
  field.textContent = name;
  return field;
}

describe("BoardPills rename", () => {
  it("puts a pencil to the left of the X on each board", () => {
    renderPills();
    const edit = screen.getByRole("button", { name: "Rename board Work" });
    const remove = screen.getByRole("button", { name: "Remove board Work" });
    expect(edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the name as editable text in the same pill, with no input box", () => {
    renderPills();
    fireEvent.click(screen.getByRole("button", { name: "Rename board Work" }));
    const field = screen.getByRole("textbox", { name: "Rename board Work" });
    expect(field.textContent).toBe("Work");
    expect(field.tagName).toBe("SPAN");
    expect(field.closest("input")).toBeNull();
  });

  it("saves the new name on Enter", () => {
    const { onRename } = renderPills();
    const field = startRename("Office");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith(boards[0], "Office");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("restores the old name on Escape without saving", () => {
    const { onRename } = renderPills();
    const field = startRename("Office");
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Work" })).toBeTruthy();
  });

  it("saves when the user leaves the pill", () => {
    const { onRename } = renderPills();
    fireEvent.blur(startRename("Office"));
    expect(onRename).toHaveBeenCalledWith(boards[0], "Office");
  });

  it("does nothing for an empty name", () => {
    const { onRename } = renderPills();
    fireEvent.keyDown(startRename("   "), { key: "Enter" });
    expect(onRename).not.toHaveBeenCalled();
  });
});
