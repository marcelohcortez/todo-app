"use client";

import type { Board } from "@/lib/types";

// Filter value for "all boards". Board ids are used for the other pills.
export const ALL = "all";

interface Props {
  boards: Board[];
  value: string;
  onChange: (value: string) => void;
  // Asks to remove a board. The page shows the confirmation.
  onRemove: (board: Board) => void;
}

// Pills that filter the list by board. "ALL" is always first. Each board has an x to remove it.
export default function BoardPills({ boards, value, onChange, onRemove }: Props) {
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
      {boards.map((b) => (
        <span key={b.id} className={`pill-board ${value === b.id ? "active" : ""}`}>
          <button
            type="button"
            className="pill-name"
            aria-pressed={value === b.id}
            onClick={() => onChange(b.id)}
          >
            {b.name}
          </button>
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
      ))}
    </div>
  );
}
