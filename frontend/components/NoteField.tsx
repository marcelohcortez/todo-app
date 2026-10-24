"use client";

import { useRef } from "react";
import MicButton from "./MicButton";
import { cn } from "./ui/cn";
import { textareaField } from "./ui/styles";

const MAX_LENGTH = 20000;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
  autoFocus?: boolean;
}

// The note text box with the microphone. Speech is added to the text, the same as in the task form.
export default function NoteField({ value, onChange, onError, autoFocus = false }: Props) {
  // Text typed before dictation starts is kept; the spoken words are added after it.
  const spokenPrefix = useRef("");

  return (
    <div className="relative">
      <textarea
        className={cn(textareaField, "pr-12")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a note, or tap the mic and speak"
        maxLength={MAX_LENGTH}
        aria-label="Note text"
        autoFocus={autoFocus}
      />
      <MicButton
        onStart={() => {
          spokenPrefix.current = value.trim() ? `${value.trimEnd()} ` : "";
        }}
        onResult={(text) => onChange((spokenPrefix.current + text).slice(0, MAX_LENGTH))}
        onError={onError}
      />
    </div>
  );
}
