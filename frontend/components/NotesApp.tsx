"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Nav from "./Nav";
import NoteField from "./NoteField";
import { useLiveRefresh } from "./useLiveRefresh";
import type { Note } from "@/lib/types";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function api(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState("");

  const [body, setBody] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notes", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setNotes(data.notes);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  // "New note" from another page links to /notes?add=1, which opens the note sheet here.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      setSheetOpen(true);
      window.history.replaceState(null, "", "/notes");
    }
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  function addNote(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setError("");
    api("/api/notes", { method: "POST", body: JSON.stringify({ body: text }) })
      .then(() => {
        setBody("");
        setSheetOpen(false);
        return load();
      })
      .catch((err) => setError((err as Error).message));
  }

  return (
    <>
      <Nav current="notes" onAddNote={() => setSheetOpen(true)} />

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="New note"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2>New note</h2>
              <button className="ghost" type="button" onClick={() => setSheetOpen(false)}>
                Cancel
              </button>
            </div>
            <form className="add-sheet" onSubmit={addNote}>
              <NoteField value={body} onChange={setBody} onError={setError} autoFocus />
              <button type="submit">Save note</button>
            </form>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      <main className="container">
        <form className="add-note" onSubmit={addNote}>
          <NoteField value={body} onChange={setBody} onError={setError} />
          <button type="submit">Save note</button>
        </form>

        {error && <p className="error">{error}</p>}

        {notes === null ? (
          <p className="muted">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="muted">No notes yet. Write one above, or use + on your phone.</p>
        ) : (
          <ul className="list">
            {notes.map((note) => (
              <li key={note.id} className="item">
                <Link href={`/notes/${note.id}`} className="note-link">
                  <span className="note-preview">{note.body}</span>
                  <span className="meta">
                    <span>Added {fmt(note.createdAt)}</span>
                    {note.updatedAt !== note.createdAt && <span>Edited {fmt(note.updatedAt)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
