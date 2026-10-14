"use client";

import { FormEvent, useRef } from "react";
import MicButton from "./MicButton";
import { PRIORITIES } from "@/lib/types";
import type { Priority } from "@/lib/types";

const LABEL: Record<Priority, string> = { high: "High", medium: "Medium", normal: "Normal" };

interface Props {
  // "inline" is the row on the To do page; "sheet" is the pop-up used on mobile.
  variant: "inline" | "sheet";
  title: string;
  onTitleChange: (value: string) => void;
  priority: Priority;
  onPriorityChange: (value: Priority) => void;
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
  onSubmit,
  onError,
  autoFocus = false,
}: Props) {
  // Text typed before dictation starts is kept; the spoken words are added after it.
  const spokenPrefix = useRef("");

  return (
    <form className={variant === "inline" ? "add" : "add-sheet"} onSubmit={onSubmit}>
      <div className="input-wrap">
        <input
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
      <select
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
      <button type="submit">Add</button>
    </form>
  );
}
