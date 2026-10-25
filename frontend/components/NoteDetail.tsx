"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Nav from "./Nav";
import NoteField from "./NoteField";
import { useLiveRefresh } from "./useLiveRefresh";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { card, errorText, mutedText, pageMain } from "./ui/styles";
import { api } from "@/lib/api";
import type { Note } from "@/lib/types";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function NoteDetail({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const toast = useToast();

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
        toast("Note saved");
      })
      .catch((err) => {
        setError((err as Error).message);
        toast((err as Error).message, "error");
      });
  }

  function remove() {
    if (!window.confirm("Delete this note? It will also be removed from your vault on the next sync.")) return;
    api(`/api/notes/${id}`, { method: "DELETE" })
      .then(() => {
        toast("Note deleted");
        router.replace("/notes");
      })
      .catch((err) => {
        setError((err as Error).message);
        toast((err as Error).message, "error");
      });
  }

  return (
    <>
      <Nav current="notes" />
      <main className={pageMain}>
        <p className="mb-4">
          <Link href="/notes" className="text-sm text-gray-400 transition hover:text-gray-100">
            ← All notes
          </Link>
        </p>

        {notFound ? (
          <p className={mutedText}>This note does not exist. It may have been deleted.</p>
        ) : note === null ? (
          <p className={mutedText}>Loading…</p>
        ) : (
          <div className={card}>
            <form onSubmit={save} className="grid gap-3">
              <NoteField value={text} onChange={(v) => { setText(v); setSaved(false); }} onError={setError} />
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" intent="danger" type="button" onClick={remove}>
                  Delete
                </Button>
                <span className="text-sm text-gray-400">{saved && !dirty ? "Saved" : ""}</span>
                <Button type="submit" disabled={!dirty || text.trim().length === 0}>
                  Save
                </Button>
              </div>
            </form>
            {error && <p className={cn("mt-3", errorText)}>{error}</p>}
            <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-800 pt-3 text-xs text-gray-500">
              <span>Added {fmt(note.createdAt)}</span>
              {note.updatedAt !== note.createdAt && <span>Edited {fmt(note.updatedAt)}</span>}
            </p>
          </div>
        )}
      </main>
    </>
  );
}
