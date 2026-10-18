"use client";

import { useRef, useState } from "react";
import type { Board } from "@/lib/types";

// Filter value for "all boards". Board ids are used for the other pills.
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

// The board's name, made editable in place inside its pill. Enter or leaving the pill saves; Escape restores the name.
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
      className="pill-name editing"
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

// Pills that filter the list by board. "ALL" is always first. Each board has a pencil to rename it and an x to remove it.
export default function BoardPills({ boards, value, onChange, onRemove, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="pills" role="group" aria-label="Filter by board">
      <button
        type="button"
        className={`pill ${value === ALL ? "active" : ""}`}
        aria-pressed={value === ALL}
        onClick={() => onChange(ALL)}
      >
        All
      </button>
      {boards.map((b) => {
        const editing = editingId === b.id;
        return (
          <span key={b.id} className={`pill-board ${value === b.id ? "active" : ""}`}>
            {editing ? (
              <RenameText
                name={b.name}
                onSave={(name) => {
                  setEditingId(null);
                  onRename(b, name);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <button
                type="button"
                className="pill-name"
                aria-pressed={value === b.id}
                onClick={() => onChange(b.id)}
              >
                {b.name}
              </button>
            )}
            {!editing && (
              <button
                type="button"
                className="pill-edit"
                onClick={() => setEditingId(b.id)}
                aria-label={`Rename board ${b.name}`}
                title="Rename board"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16z" />
                  <path d="M13.5 6.5l4 4" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="pill-remove"
              onClick={() => onRemove(b)}
              aria-label={`Remove board ${b.name}`}
              title="Remove board"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        );
      })}
    </div>
  );
}
