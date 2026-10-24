"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import Sheet from "./ui/Sheet";
import { cn } from "./ui/cn";
import { errorText, field, mutedText } from "./ui/styles";
import type { Board } from "@/lib/types";

export type BoardRemoval = { action: "delete" } | { action: "move"; targetId: string };

// One of the two choices. The selected one gets the purple outline.
function choice(selected: boolean): string {
  return cn(
    "flex w-full flex-col items-start gap-0.5 rounded-xl border p-3 text-left text-sm transition",
    "hover:bg-gray-800/60 disabled:pointer-events-none disabled:opacity-50",
    selected ? "border-primary-500 bg-primary-500/10" : "border-gray-700"
  );
}

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
    <Sheet label={`Remove board ${board.name}`} title={`Remove “${board.name}”?`} onClose={onCancel}>
      <p className={mutedText}>{taskText}</p>

      {hasTasks && (
        <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="What happens to the tasks">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "move"}
            className={choice(mode === "move")}
            onClick={() => setMode("move")}
            disabled={!canMove}
          >
            <span className="font-medium text-gray-100">Move its tasks to another board</span>
            {!canMove && <span className="text-xs text-gray-400">You have no other board yet.</span>}
          </button>
          {mode === "move" && canMove && (
            <select
              className={field}
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
            className={choice(mode === "delete")}
            onClick={() => setMode("delete")}
          >
            <span className="font-medium text-gray-100">Delete its tasks too</span>
            <span className="text-xs text-gray-400">This cannot be undone.</span>
          </button>
        </div>
      )}

      {error && <p className={cn("mt-3", errorText)}>{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" intent="gray" onClick={onCancel} disabled={busy}>
          Keep board
        </Button>
        <Button intent="danger" onClick={confirm} disabled={busy}>
          {busy ? "Removing…" : "Remove board"}
        </Button>
      </div>
    </Sheet>
  );
}
