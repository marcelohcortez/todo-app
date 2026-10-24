"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./ui/cn";
import { CloseIcon } from "./ui/icons";
import { field, iconButton, mutedText } from "./ui/styles";

// Searching starts at this many characters. Shorter text shows the full list. Matches MIN_SEARCH on the server.
export const MIN_SEARCH = 3;
// The search runs once typing has paused for this long.
const PAUSE_MS = 300;

interface Props {
  label: string;
  // Called with the text to search for, or "" to show everything again.
  onSearch: (query: string) => void;
}

// A search field that searches as the user types. The × clears it and shows the full list.
export default function SearchBar({ label, onSearch }: Props) {
  const [text, setText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  // The last query sent, so typing that does not change it sends nothing.
  const sent = useRef("");

  function send(query: string) {
    if (query === sent.current) return;
    sent.current = query;
    onSearch(query);
  }

  function change(value: string) {
    setText(value);
    const trimmed = value.trim();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(trimmed.length >= MIN_SEARCH ? trimmed : ""), PAUSE_MS);
  }

  function clear() {
    setText("");
    clearTimeout(timer.current);
    send("");
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const tooShort = text.trim().length > 0 && text.trim().length < MIN_SEARCH;

  return (
    <div className="mt-4">
      <div className="relative">
        <input
          className={cn(field, "pr-10")}
          type="text"
          value={text}
          onChange={(e) => change(e.target.value)}
          placeholder={label}
          aria-label={label}
          autoComplete="off"
          enterKeyHint="search"
        />
        {text && (
          <button
            className={cn(iconButton, "absolute right-1 top-1/2 -translate-y-1/2")}
            type="button"
            onClick={clear}
            aria-label="Clear search"
            title="Clear search"
          >
            <CloseIcon />
          </button>
        )}
      </div>
      {tooShort && <p className={cn("mt-1.5", mutedText)}>Type at least {MIN_SEARCH} characters to search.</p>}
    </div>
  );
}
