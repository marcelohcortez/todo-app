"use client";

import { FormEvent, ReactNode, useState } from "react";

interface Props {
  // Resolves to true when the board was created.
  onCreate: (name: string) => Promise<boolean>;
  // Shown on the left of "+ New board" in the same row, for example the "+ New task" toggle.
  before?: ReactNode;
  // The parent owns the open state so it can close this form when another one opens.
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

// The row of controls above the add-task field: "+ New board" opens a small inline form.
export default function NewBoardForm({ onCreate, before, open, onOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    const ok = await onCreate(n);
    setBusy(false);
    if (ok) {
      setName("");
      onClose();
    }
  }

  return (
    <>
      <div className="board-bar">
        {before}
        {open ? (
          // Cancel takes the place of "+ New board", the same as the task form's Cancel.
          <button
            className="ghost"
            type="button"
            onClick={() => {
              onClose();
              setName("");
            }}
          >
            Cancel
          </button>
        ) : (
          <button className="ghost" type="button" onClick={onOpen}>
            + New board
          </button>
        )}
      </div>

      {open && (
        <form className="board-form" onSubmit={submit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name of the new board"
            maxLength={40}
            aria-label="New board name"
            autoFocus
          />
          <button type="submit" disabled={busy || !name.trim()}>
            Create board
          </button>
        </form>
      )}
    </>
  );
}
