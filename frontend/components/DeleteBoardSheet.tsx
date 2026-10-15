"use client";

import { useEffect, useState } from "react";
import type { Board } from "@/lib/types";

export type BoardRemoval = { action: "delete" } | { action: "move"; targetId: string };

interface Props {
  board: Board;
  // The other boards, which can receive the tasks.
  otherBoards: Board[];
  onCancel: () => void;
  // Resolves to an error message, or null when the board was removed.
  onConfirm: (removal: BoardRemoval) => Promise<string | null>;
}

// Asks for confirmation before a board is removed, and what happens to its tasks.
export default function DeleteBoardSheet({ board, otherBoards, onCancel, onConfirm }: Props) {
  const hasTasks = board.taskCount > 0;
  const canMove = otherBoards.length > 0;
  // Moving is the safer default, so tasks are kept unless the user picks deletion.
  const [mode, setMode] = useState<"move" | "delete">(canMove ? "move" : "delete");
  const [targetId, setTargetId] = useState(otherBoards[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function confirm() {
    setError("");
    setBusy(true);
    const removal: BoardRemoval =
      hasTasks && mode === "move" ? { action: "move", targetId } : { action: "delete" };
    const message = await onConfirm(removal);
    setBusy(false);
    if (message) setError(message);
  }

  const taskText = !hasTasks
    ? "It has no tasks."
    : board.taskCount === 1
      ? "It has 1 task."
      : `It has ${board.taskCount} tasks.`;

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Remove board ${board.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2>Remove “{board.name}”?</h2>
          <button className="ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>

        <p className="muted">{taskText}</p>

        {hasTasks && (
          <div className="choices" role="radiogroup" aria-label="What happens to the tasks">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "move"}
              className={`choice ${mode === "move" ? "selected" : ""}`}
              onClick={() => setMode("move")}
              disabled={!canMove}
            >
              <span className="choice-title">Move its tasks to another board</span>
              {!canMove && <span className="choice-note">You have no other board yet.</span>}
            </button>
            {mode === "move" && canMove && (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                aria-label="Board that receives the tasks"
              >
                {otherBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={mode === "delete"}
              className={`choice ${mode === "delete" ? "selected" : ""}`}
              onClick={() => setMode("delete")}
            >
              <span className="choice-title">Delete its tasks too</span>
              <span className="choice-note">This cannot be undone.</span>
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="sheet-actions">
          <button className="ghost" type="button" onClick={onCancel} disabled={busy}>
            Keep board
          </button>
          <button className="btn-danger" type="button" onClick={confirm} disabled={busy}>
            {busy ? "Removing…" : "Remove board"}
          </button>
        </div>
      </div>
    </div>
  );
}
