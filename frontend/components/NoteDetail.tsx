"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function NoteDetail({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadNote = useCallback(() => {
    fetch(`/api/notes/${id}`, { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setNote(data.note);
      setText(data.note.body);
    });
  }, [id]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const dirty = note !== null && text.trim() !== note.body;

  // Show changes made on another device, but never replace text that has not been saved yet.
  useLiveRefresh(() => {
    if (!dirty) loadNote();
  });

  function save(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError("");
    setSaved(false);
    api(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ body }) })
      .then((data) => {
        const updated = (data as { note: Note }).note;
        setNote(updated);
        setText(updated.body);
        setSaved(true);
      })
      .catch((err) => setError((err as Error).message));
  }

  function remove() {
    if (!window.confirm("Delete this note? It will also be removed from your vault on the next sync.")) return;
    api(`/api/notes/${id}`, { method: "DELETE" })
      .then(() => router.replace("/notes"))
      .catch((err) => setError((err as Error).message));
  }

  return (
    <>
      <Nav current="notes" />
      <main className="container">
        <p className="back">
          <Link href="/notes">← All notes</Link>
        </p>

        {notFound ? (
          <p className="muted">This note does not exist. It may have been deleted.</p>
        ) : note === null ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="card note-detail">
            <form onSubmit={save}>
              <NoteField value={text} onChange={(v) => { setText(v); setSaved(false); }} onError={setError} />
              <div className="note-actions">
                <button className="ghost danger" type="button" onClick={remove}>
                  Delete
                </button>
                <span className="muted">{saved && !dirty ? "Saved" : ""}</span>
                <button type="submit" disabled={!dirty || text.trim().length === 0}>
                  Save
                </button>
              </div>
            </form>
            {error && <p className="error">{error}</p>}
            <p className="meta">
              <span>Added {fmt(note.createdAt)}</span>
              {note.updatedAt !== note.createdAt && <span>Edited {fmt(note.updatedAt)}</span>}
            </p>
          </div>
        )}
      </main>
    </>
  );
}
