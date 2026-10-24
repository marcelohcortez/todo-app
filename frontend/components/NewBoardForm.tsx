"use client";

import { FormEvent, ReactNode, useState } from "react";
import Button from "./ui/Button";
import { field } from "./ui/styles";

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
      <div className="board-bar mb-3 flex flex-wrap items-center gap-2">
        {before}
        {open ? (
          // Cancel takes the place of "+ New board", the same as the task form's Cancel.
          <Button
            variant="ghost"
            intent="gray"
            size="sm"
            type="button"
            onClick={() => {
              onClose();
              setName("");
            }}
          >
            Cancel
          </Button>
        ) : (
          <Button variant="ghost" intent="gray" size="sm" type="button" onClick={onOpen}>
            + New board
          </Button>
        )}
      </div>

      {open && (
        <form className="mb-4 flex gap-2" onSubmit={submit}>
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name of the new board"
            maxLength={40}
            aria-label="New board name"
            autoFocus
          />
          <Button type="submit" size="md" className="shrink-0" disabled={busy || !name.trim()}>
            Create board
          </Button>
        </form>
      )}
    </>
  );
}
