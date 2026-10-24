"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Nav from "./Nav";
import NoteField from "./NoteField";
import { useLiveRefresh } from "./useLiveRefresh";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import Sheet from "./ui/Sheet";
import { cn } from "./ui/cn";
import { PencilIcon, TrashIcon } from "./ui/icons";
import { errorText, iconButton, iconButtonDanger, mutedText, pageMain } from "./ui/styles";
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
    <li className="item flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3.5 shadow-lg shadow-black/10 transition hover:border-gray-700">
      <div className="min-w-0 flex-1">
        <Link href={`/notes/${note.id}`} className="block rounded-lg outline-2 outline-primary-500 focus-visible:outline">
          <span
            ref={previewRef}
            className={cn("block whitespace-pre-wrap break-words text-base text-gray-100", !expanded && "line-clamp-3")}
          >
            {note.body}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-gray-500">
            <span>Added {fmt(note.createdAt)}</span>
            {note.updatedAt !== note.createdAt && <span>Edited {fmt(note.updatedAt)}</span>}
          </span>
        </Link>
        {(overflows || expanded) && (
          <Button
            variant="ghost"
            intent="primary"
            size="xs"
            type="button"
            className="-ml-2 mt-1"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
      <div className="flex shrink-0 gap-0.5">
        <button className={iconButton} type="button" onClick={() => onEdit(note)} aria-label="Edit note" title="Edit">
          <PencilIcon />
        </button>
        <button
          className={cn(iconButton, iconButtonDanger)}
          type="button"
          onClick={() => onDelete(note)}
          aria-label="Delete note"
          title="Delete"
        >
          <TrashIcon />
        </button>
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
        <Sheet label="New note" title="New note" onClose={() => setSheetOpen(false)}>
          <form className="grid gap-2" onSubmit={addNote}>
            <NoteField value={body} onChange={setBody} onError={setError} autoFocus />
            <Button type="submit" size="lg">
              Save note
            </Button>
          </form>
          {error && <p className={cn("mt-3", errorText)}>{error}</p>}
        </Sheet>
      )}

      <main className={pageMain}>
        <Button
          variant="soft"
          size="sm"
          type="button"
          onClick={() => setInlineOpen((open) => !open)}
          aria-expanded={inlineOpen}
        >
          {inlineOpen ? "Cancel" : "+ New note"}
        </Button>

        {inlineOpen && (
          <form className="mt-4 grid gap-2 rounded-xl border border-gray-800 bg-gray-900 p-3 shadow-lg shadow-black/20" onSubmit={addNote}>
            <NoteField value={body} onChange={setBody} onError={setError} autoFocus />
            <div className="flex justify-end">
              <Button type="submit">Save note</Button>
            </div>
          </form>
        )}

        {error && <p className={cn("mt-3", errorText)}>{error}</p>}

        {notes === null ? (
          <p className={cn("mt-5", mutedText)}>Loading…</p>
        ) : notes.length === 0 ? (
          <p className={cn("mt-5", mutedText)}>No notes yet. Write one above, or use + on your phone.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-2.5">
            {notes.map((note) =>
              editingId === note.id ? (
                <li key={note.id} className="item grid gap-2 rounded-xl border border-primary-500/40 bg-gray-900 p-3.5 shadow-lg shadow-black/20">
                  <NoteField value={editBody} onChange={setEditBody} onError={setError} autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" intent="gray" size="sm" type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => saveEdit(note.id)}
                      disabled={editBody.trim().length === 0}
                    >
                      Save
                    </Button>
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
