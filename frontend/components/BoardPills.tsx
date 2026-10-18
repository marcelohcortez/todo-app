"use client";

import { useRef, useState } from "react";
import type { Board } from "@/lib/types";

// Value for "All boards" in the select. Board ids are used for the other options.
export const ALL = "all";

interface Props {
  boards: Board[];
  value: string;
  onChange: (value: string) => void;
  // Asks to remove a board. The page shows the confirmation.
  onRemove: (board: Board) => void;
  // Saves a new name for a board. The page shows the result.
  onRename: (board: Board, name: string) => void;
}

interface RenameTextProps {
  name: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

// The board's name, made editable in place where the select is. Enter or leaving it saves; Escape restores the name.
function RenameText({ name, onSave, onCancel }: RenameTextProps) {
  // Set once the edit has ended, so a blur that follows Enter or Escape does nothing.
  const done = useRef(false);

  function finish(save: boolean, el: HTMLSpanElement) {
    if (done.current) return;
    done.current = true;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (save && text && text !== name) {
      onSave(text);
    } else {
      onCancel();
    }
  }

  return (
    <span
      className="board-name-edit"
      role="textbox"
      aria-label={`Rename board ${name}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      ref={(el) => {
        // The text is written here, not passed as children, so React does not overwrite what the user types.
        if (!el || el.textContent) return;
        el.textContent = name;
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true, e.currentTarget);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false, e.currentTarget);
        }
      }}
      onBlur={(e) => finish(true, e.currentTarget)}
    />
  );
}

// A select that chooses which board's tasks are shown. With a board selected, a pencil renames it and a trash can removes it.
export default function BoardPills({ boards, value, onChange, onRemove, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const selected = boards.find((b) => b.id === value) ?? null;

  return (
    <div className="board-picker">
      {editing && selected ? (
        <RenameText
          name={selected.name}
          onSave={(name) => {
            setEditing(false);
            onRename(selected, name);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <select
          className="board-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Show board"
        >
          <option value={ALL}>All boards</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      {selected && !editing && (
        <>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setEditing(true)}
            aria-label={`Rename board ${selected.name}`}
            title="Rename board"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
              <path d="M13.5 6.5l4 4" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => onRemove(selected)}
            aria-label={`Remove board ${selected.name}`}
            title="Remove board"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
