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

// value is the id of the board shown in the select; ALL is the "All boards" option.
function renderPicker(value: string = "b1") {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const onRename = vi.fn();
  const onShare = vi.fn();
  render(
    <BoardPills
      boards={boards}
      value={value}
      onChange={onChange}
      onRemove={onRemove}
      onRename={onRename}
      onShare={onShare}
    />
  );
  return { onChange, onRemove, onRename, onShare };
}

// Clicks the pencil for "Work" and types a new name into the editable text that replaces the select.
function startRename(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Rename board Work" }));
  const field = screen.getByRole("textbox", { name: "Rename board Work" });
  field.textContent = name;
  return field;
}

describe("BoardPills", () => {
  it("lists All boards and each board in a select", () => {
    renderPicker();
    const select = screen.getByRole("combobox", { name: "Show board" });
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toEqual(["All boards", "Work", "Home"]);
  });

  it("asks the parent to show the board that is chosen in the select", () => {
    const { onChange } = renderPicker();
    fireEvent.change(screen.getByRole("combobox", { name: "Show board" }), { target: { value: "b2" } });
    expect(onChange).toHaveBeenCalledWith("b2");
  });

  it("shows no pencil or trash can when All boards is selected", () => {
    renderPicker(ALL);
    expect(screen.queryByRole("button", { name: "Rename board Work" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove board Work" })).toBeNull();
  });

  it("puts the pencil before the trash can for the selected board", () => {
    renderPicker();
    const edit = screen.getByRole("button", { name: "Rename board Work" });
    const remove = screen.getByRole("button", { name: "Remove board Work" });
    expect(edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("asks the parent to remove the selected board when the trash can is pressed", () => {
    const { onRemove } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Remove board Work" }));
    expect(onRemove).toHaveBeenCalledWith(boards[0]);
  });

  it("asks the parent to share the selected board when the share icon is pressed", () => {
    const { onShare } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Share board Work" }));
    expect(onShare).toHaveBeenCalledWith(boards[0]);
  });

  it("turns the select into the editable name, with no input box, when the pencil is pressed", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Rename board Work" }));
    const field = screen.getByRole("textbox", { name: "Rename board Work" });
    expect(field.textContent).toBe("Work");
    expect(field.tagName).toBe("SPAN");
    expect(field.closest("input")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Show board" })).toBeNull();
  });

  it("saves the new name on Enter and shows the select again", () => {
    const { onRename } = renderPicker();
    fireEvent.keyDown(startRename("Office"), { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith(boards[0], "Office");
    expect(screen.getByRole("combobox", { name: "Show board" })).toBeTruthy();
  });

  it("restores the old name on Escape without saving", () => {
    const { onRename } = renderPicker();
    fireEvent.keyDown(startRename("Office"), { key: "Escape" });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Show board" })).toBeTruthy();
  });

  it("saves when the user leaves the name", () => {
    const { onRename } = renderPicker();
    fireEvent.blur(startRename("Office"));
    expect(onRename).toHaveBeenCalledWith(boards[0], "Office");
  });

  it("does nothing for an empty name", () => {
    const { onRename } = renderPicker();
    fireEvent.keyDown(startRename("   "), { key: "Enter" });
    expect(onRename).not.toHaveBeenCalled();
  });
});
