"use client";

import { FormEvent, useRef } from "react";
import MicButton from "./MicButton";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { field } from "./ui/styles";
import { PRIORITIES } from "@/lib/types";
import type { Board, Priority } from "@/lib/types";

const LABEL: Record<Priority, string> = { high: "High", medium: "Medium", normal: "Normal" };

// Value of the board select's "Create new board" option.
export const NEW_BOARD = "__new__";

interface Props {
  // "inline" is the row on the To do page; "sheet" is the pop-up used on mobile.
  variant: "inline" | "sheet";
  title: string;
  onTitleChange: (value: string) => void;
  priority: Priority;
  onPriorityChange: (value: Priority) => void;
  boards: Board[];
  // A board id, or NEW_BOARD to create one with the task.
  boardId: string;
  onBoardChange: (value: string) => void;
  newBoardName: string;
  onNewBoardNameChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onError: (message: string) => void;
  autoFocus?: boolean;
}

export default function AddTaskForm({
  variant,
  title,
  onTitleChange,
  priority,
  onPriorityChange,
  boards,
  boardId,
  onBoardChange,
  newBoardName,
  onNewBoardNameChange,
  onSubmit,
  onError,
  autoFocus = false,
}: Props) {
  // Text typed before dictation starts is kept; the spoken words are added after it.
  const spokenPrefix = useRef("");

  return (
    <form
      className={cn(
        "grid grid-cols-2 gap-2 min-[521px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
        variant === "inline" && "mb-5 rounded-xl border border-gray-800 bg-gray-900 p-3 shadow-lg shadow-black/20"
      )}
      onSubmit={onSubmit}
    >
      <div className="relative col-span-2 min-[521px]:col-span-3">
        <input
          className={cn(field, "pr-12")}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="What needs doing?"
          maxLength={500}
          aria-label="New task title"
          autoFocus={autoFocus}
        />
        <MicButton
          onStart={() => {
            spokenPrefix.current = title.trim() ? `${title.trimEnd()} ` : "";
          }}
          onResult={(text) => onTitleChange((spokenPrefix.current + text).slice(0, 500))}
          onError={onError}
        />
      </div>
      <select className={field} value={boardId} onChange={(e) => onBoardChange(e.target.value)} aria-label="Board">
        <option value="" disabled>
          Select board
        </option>
        <option value={NEW_BOARD}>+ Add new board</option>
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <select
        className={field}
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value as Priority)}
        aria-label="Priority"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {LABEL[p]}
          </option>
        ))}
      </select>
      {boardId === NEW_BOARD && (
        <input
          className={cn(field, "col-span-2 min-[521px]:col-span-3")}
          value={newBoardName}
          onChange={(e) => onNewBoardNameChange(e.target.value)}
          placeholder="Name of the new board"
          maxLength={40}
          aria-label="New board name"
        />
      )}
      <Button type="submit" className="col-span-2 min-[521px]:col-span-1">
        Add
      </Button>
    </form>
  );
}
