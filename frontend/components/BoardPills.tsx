"use client";

import type { Board, Task } from "@/lib/types";

// Filter values besides a board id.
export const ALL = "all";
export const NO_BOARD = "none";

interface Props {
  boards: Board[];
  tasks: Task[];
  value: string;
  onChange: (value: string) => void;
}

// Pills that filter the list by board. "ALL" is always first. "NO BOARD" appears only when some task has no board.
export default function BoardPills({ boards, tasks, value, onChange }: Props) {
  const hasUnassigned = tasks.some((t) => t.boardId === null);
  const options: { value: string; label: string }[] = [
    { value: ALL, label: "All" },
    ...boards.map((b) => ({ value: b.id, label: b.name })),
    ...(hasUnassigned ? [{ value: NO_BOARD, label: "No board" }] : []),
  ];

  return (
    <div className="pills" role="group" aria-label="Filter by board">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`pill ${value === o.value ? "active" : ""}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
