"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Nav from "./Nav";
import NoteField from "./NoteField";
import { useLiveRefresh } from "./useLiveRefresh";
import { useToast } from "./Toast";
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

interface NoteItemProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

// One note in the list. The preview is cut to three lines; "Show more" appears only when that cut hides text.
function NoteItem({ note, onEdit, onDelete }: NoteItemProps) {
  const previewRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = previewRef.current;
    // While expanded the text is not clipped, so there is nothing to measure.
    if (!el || expanded) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [note.body, expanded]);

  return (
    <li className="item">
      <div className="body">
        <Link href={`/notes/${note.id}`} className="note-link">
          <span ref={previewRef} className={`note-preview${expanded ? " expanded" : ""}`}>
            {note.body}
          </span>
          <span className="meta">
            <span>Added {fmt(note.createdAt)}</span>
            {note.updatedAt !== note.createdAt && <span>Edited {fmt(note.updatedAt)}</span>}
          </span>
        </Link>
        {(overflows || expanded) && (
          <button
            className="ghost note-toggle"
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
        <div className="item-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={() => onEdit(note)}
            aria-label="Edit note"
            title="Edit"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
              <path d="M13.5 6.5l4 4" />
            </svg>
          </button>
          <button
            className="icon-btn danger"
            type="button"
            onClick={() => onDelete(note)}
            aria-label="Delete note"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState("");
  const toast = useToast();

  const [body, setBody] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  // The inline add form on desktop stays hidden until "+ New note" is pressed.
  const [inlineOpen, setInlineOpen] = useState(false);

  // The note being edited in place, and its text while the edit is open.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

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
        setInlineOpen(false);
        toast("Note saved");
        return load();
      })
      .catch((err) => {
        setError((err as Error).message);
        toast((err as Error).message, "error");
      });
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditBody(note.body);
  }

  function saveEdit(id: string) {
    const text = editBody.trim();
    if (!text) return;
    setError("");
    api(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ body: text }) })
      .then(() => {
        setEditingId(null);
        toast("Note updated");
        return load();
      })
      .catch((err) => {
        setError((err as Error).message);
        toast((err as Error).message, "error");
      });
  }

  function remove(note: Note) {
    if (!window.confirm("Delete this note? It will also be removed from your vault on the next sync.")) return;
    setError("");
    api(`/api/notes/${note.id}`, { method: "DELETE" })
      .then(() => {
        toast("Note deleted");
        return load();
      })
      .catch((err) => {
        setError((err as Error).message);
        toast((err as Error).message, "error");
      });
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
        <button
          className="ghost new-note-toggle"
          type="button"
          onClick={() => setInlineOpen((open) => !open)}
          aria-expanded={inlineOpen}
        >
          {inlineOpen ? "Cancel" : "+ New note"}
        </button>

        {inlineOpen && (
          <form className="add-note" onSubmit={addNote}>
            <NoteField value={body} onChange={setBody} onError={setError} autoFocus />
            <button type="submit">Save note</button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {notes === null ? (
          <p className="muted">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="muted">No notes yet. Write one above, or use + on your phone.</p>
        ) : (
          <ul className="list">
            {notes.map((note) =>
              editingId === note.id ? (
                <li key={note.id} className="item editing">
                  <NoteField value={editBody} onChange={setEditBody} onError={setError} autoFocus />
                  <div className="edit-buttons">
                    <button className="ghost" type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button type="button" onClick={() => saveEdit(note.id)} disabled={editBody.trim().length === 0}>
                      Save
                    </button>
                  </div>
                </li>
              ) : (
                <NoteItem key={note.id} note={note} onEdit={startEdit} onDelete={remove} />
              )
            )}
          </ul>
        )}
      </main>
    </>
  );
}
