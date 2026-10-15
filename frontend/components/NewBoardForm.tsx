"use client";

import { FormEvent, useState } from "react";

interface Props {
  // Resolves to true when the board was created.
  onCreate: (name: string) => Promise<boolean>;
}

// The "+ New board" control above the add-task field. It opens a small inline form.
export default function NewBoardForm({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <div className="board-bar">
        <button className="ghost" type="button" onClick={() => setOpen(true)}>
          + New board
        </button>
      </div>
    );
  }

  return (
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
      <button
        className="ghost"
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
      >
        Cancel
      </button>
    </form>
  );
}
