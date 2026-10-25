"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Nav from "./Nav";
import Pagination from "./Pagination";
import { useLiveRefresh } from "./useLiveRefresh";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { PencilIcon, TrashIcon } from "./ui/icons";
import { badgeClass, card, errorText, field, headingText, iconButton, iconButtonDanger, mutedText, pageMain } from "./ui/styles";
import type { SharedBoard, SharedByMeEntry, SharedNote, SharedTask, Task } from "@/lib/types";

interface TaskPage {
  tasks: Task[];
  total: number;
  page: number;
  pageCount: number;
}

const LABEL: Record<Task["priority"], string> = { high: "High", medium: "Medium", normal: "Normal" };

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function api(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

// One task's row, shared between an individually-shared task and a task inside a shared board.
function TaskRow({
  task,
  editing,
  editTitle,
  onEditTitleChange,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  task: Task;
  editing: boolean;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onToggle: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <li className="item flex items-center gap-2 rounded-lg border border-primary-500/40 bg-gray-950/50 p-3">
        <input
          className={cn(field, "min-w-0 flex-1")}
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          maxLength={500}
          autoFocus
        />
        <Button size="sm" onClick={onSaveEdit}>
          Save
        </Button>
        <Button variant="ghost" intent="gray" size="sm" onClick={onCancelEdit}>
          Cancel
        </Button>
      </li>
    );
  }
  return (
    <li className="item flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3">
      <input
        type="checkbox"
        className="check"
        checked={task.completed}
        onChange={onToggle}
        aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      />
      <div className="min-w-0 flex-1">
        <span className={cn("block break-words text-sm text-gray-100", task.completed && "text-gray-500 line-through")}>
          {task.title}
        </span>
        <span className={cn("mt-1 inline-block", badgeClass(task.priority))}>{LABEL[task.priority]}</span>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <button className={iconButton} type="button" onClick={onStartEdit} aria-label={`Edit "${task.title}"`} title="Edit">
          <PencilIcon />
        </button>
        <button className={cn(iconButton, iconButtonDanger)} type="button" onClick={onDelete} aria-label={`Delete "${task.title}"`} title="Delete">
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

export default function SharedPage() {
  const toast = useToast();
  const [boards, setBoards] = useState<{ boards: SharedBoard[]; page: number; pageCount: number } | null>(null);
  const [tasks, setTasks] = useState<{ tasks: SharedTask[]; page: number; pageCount: number } | null>(null);
  const [notes, setNotes] = useState<{ notes: SharedNote[]; page: number; pageCount: number } | null>(null);
  const [byMe, setByMe] = useState<{ shares: SharedByMeEntry[]; page: number; pageCount: number } | null>(null);

  const [boardsPage, setBoardsPage] = useState(1);
  const [tasksPage, setTasksPage] = useState(1);
  const [notesPage, setNotesPage] = useState(1);
  const [byMePage, setByMePage] = useState(1);

  // The shared board currently expanded to show its tasks, and that board's own task list.
  const [openBoardId, setOpenBoardId] = useState<string | null>(null);
  const [boardTasks, setBoardTasks] = useState<TaskPage | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteBody, setEditNoteBody] = useState("");

  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [b, t, n, m] = await Promise.all([
      fetch(`/api/shared/with-me/boards?page=${boardsPage}`, { cache: "no-store" }),
      fetch(`/api/shared/with-me/tasks?page=${tasksPage}`, { cache: "no-store" }),
      fetch(`/api/shared/with-me/notes?page=${notesPage}`, { cache: "no-store" }),
      fetch(`/api/shared/by-me?page=${byMePage}`, { cache: "no-store" }),
    ]);
    if ([b, t, n, m].some((r) => r.status === 401)) {
      window.location.href = "/login";
      return;
    }
    setBoards(await b.json());
    setTasks(await t.json());
    setNotes(await n.json());
    setByMe(await m.json());
  }, [boardsPage, tasksPage, notesPage, byMePage]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  const loadBoardTasks = useCallback(async (boardId: string, page = 1) => {
    const res = await fetch(`/api/shared/with-me/boards/${boardId}/tasks?page=${page}`, { cache: "no-store" });
    if (!res.ok) return;
    setBoardTasks((await res.json()) as TaskPage);
  }, []);

  function toggleBoard(boardId: string) {
    if (openBoardId === boardId) {
      setOpenBoardId(null);
      setBoardTasks(null);
      return;
    }
    setOpenBoardId(boardId);
    loadBoardTasks(boardId);
  }

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setError("");
    try {
      await action();
      if (successMessage) toast(successMessage);
      await load();
      if (openBoardId) await loadBoardTasks(openBoardId, boardTasks?.page ?? 1);
    } catch (err) {
      setError((err as Error).message);
      toast((err as Error).message, "error");
    }
  }

  function toggleTask(task: Task) {
    run(() => api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: !task.completed }) }));
  }

  function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    run(() => api(`/api/tasks/${task.id}`, { method: "DELETE" }), "Task deleted");
  }

  function saveTaskEdit(id: string) {
    const title = editTitle.trim();
    if (!title) return;
    run(() => api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ title }) })).then(() => setEditingId(null));
  }

  function addTaskToBoard(e: FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !openBoardId) return;
    run(() => api("/api/tasks", { method: "POST", body: JSON.stringify({ title, boardId: openBoardId }) }), "Task added").then(() =>
      setNewTaskTitle("")
    );
  }

  function saveNoteEdit(id: string) {
    const body = editNoteBody.trim();
    if (!body) return;
    run(() => api(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ body }) })).then(() => setEditingNoteId(null));
  }

  function deleteNote(id: string) {
    if (!window.confirm("Delete this note?")) return;
    run(() => api(`/api/notes/${id}`, { method: "DELETE" }), "Note deleted");
  }

  function unshare(entry: SharedByMeEntry) {
    if (!window.confirm(`Stop sharing "${entry.name}" with ${entry.friendEmail}?`)) return;
    run(() => api(`/api/shares/${entry.shareId}`, { method: "DELETE" }), "Unshared");
  }

  const loading = boards === null || tasks === null || notes === null || byMe === null;

  return (
    <>
      <Nav current="shared" />
      <main className={cn(pageMain, "grid gap-5")}>
        {error && <p className={errorText}>{error}</p>}

        {loading ? (
          <p className={mutedText}>Loading…</p>
        ) : (
          <>
            <section className={card}>
              <h2 className={headingText}>Shared with me</h2>

              {boards!.boards.length === 0 && tasks!.tasks.length === 0 && notes!.notes.length === 0 ? (
                <p className={cn("mt-3", mutedText)}>Nothing has been shared with you yet.</p>
              ) : (
                <>
                  {boards!.boards.length > 0 && (
                    <div className="mt-3">
                      <h3 className="text-sm font-medium text-gray-300">Boards</h3>
                      <ul className="mt-2 flex flex-col gap-2">
                        {boards!.boards.map((board) => (
                          <li key={board.id} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 text-left"
                              onClick={() => toggleBoard(board.id)}
                              aria-expanded={openBoardId === board.id}
                            >
                              <span className="text-sm font-medium text-gray-100">{board.name}</span>
                              <span className="text-xs text-gray-500">from {board.ownerEmail}</span>
                            </button>
                            {openBoardId === board.id && (
                              <div className="mt-3 border-t border-gray-800 pt-3">
                                <form className="mb-3 flex gap-2" onSubmit={addTaskToBoard}>
                                  <input
                                    className={cn(field, "min-w-0 flex-1")}
                                    placeholder="New task"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    maxLength={500}
                                  />
                                  <Button type="submit" size="sm">
                                    Add
                                  </Button>
                                </form>
                                {boardTasks === null ? (
                                  <p className={mutedText}>Loading…</p>
                                ) : boardTasks.tasks.length === 0 ? (
                                  <p className={mutedText}>No tasks yet.</p>
                                ) : (
                                  <ul className="flex flex-col gap-2">
                                    {boardTasks.tasks.map((task) => (
                                      <TaskRow
                                        key={task.id}
                                        task={task}
                                        editing={editingId === task.id}
                                        editTitle={editTitle}
                                        onEditTitleChange={setEditTitle}
                                        onToggle={() => toggleTask(task)}
                                        onStartEdit={() => {
                                          setEditingId(task.id);
                                          setEditTitle(task.title);
                                        }}
                                        onSaveEdit={() => saveTaskEdit(task.id)}
                                        onCancelEdit={() => setEditingId(null)}
                                        onDelete={() => deleteTask(task)}
                                      />
                                    ))}
                                  </ul>
                                )}
                                {boardTasks && (
                                  <Pagination
                                    page={boardTasks.page}
                                    pageCount={boardTasks.pageCount}
                                    onPage={(p) => loadBoardTasks(board.id, p)}
                                  />
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      <Pagination page={boards!.page} pageCount={boards!.pageCount} onPage={setBoardsPage} />
                    </div>
                  )}

                  {tasks!.tasks.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-300">Tasks</h3>
                      <ul className="mt-2 flex flex-col gap-2">
                        {tasks!.tasks.map((task) => (
                          <div key={task.id}>
                            <TaskRow
                              task={task}
                              editing={editingId === task.id}
                              editTitle={editTitle}
                              onEditTitleChange={setEditTitle}
                              onToggle={() => toggleTask(task)}
                              onStartEdit={() => {
                                setEditingId(task.id);
                                setEditTitle(task.title);
                              }}
                              onSaveEdit={() => saveTaskEdit(task.id)}
                              onCancelEdit={() => setEditingId(null)}
                              onDelete={() => deleteTask(task)}
                            />
                            <span className="ml-3 text-xs text-gray-500">from {task.ownerEmail}</span>
                          </div>
                        ))}
                      </ul>
                      <Pagination page={tasks!.page} pageCount={tasks!.pageCount} onPage={setTasksPage} />
                    </div>
                  )}

                  {notes!.notes.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-300">Notes</h3>
                      <ul className="mt-2 flex flex-col gap-2">
                        {notes!.notes.map((note) =>
                          editingNoteId === note.id ? (
                            <li key={note.id} className="rounded-lg border border-primary-500/40 bg-gray-950/50 p-3">
                              <textarea
                                className={cn(field, "h-24 resize-y py-2")}
                                value={editNoteBody}
                                onChange={(e) => setEditNoteBody(e.target.value)}
                                autoFocus
                              />
                              <div className="mt-2 flex justify-end gap-2">
                                <Button size="sm" onClick={() => saveNoteEdit(note.id)}>
                                  Save
                                </Button>
                                <Button variant="ghost" intent="gray" size="sm" onClick={() => setEditingNoteId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </li>
                          ) : (
                            <li key={note.id} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                              <div className="min-w-0 flex-1">
                                <span className="block whitespace-pre-wrap break-words text-sm text-gray-100">{note.body}</span>
                                <span className="mt-1 block text-xs text-gray-500">
                                  from {note.ownerEmail} · Edited {fmt(note.updatedAt)}
                                </span>
                              </div>
                              <div className="flex shrink-0 gap-0.5">
                                <button
                                  className={iconButton}
                                  type="button"
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditNoteBody(note.body);
                                  }}
                                  aria-label="Edit note"
                                  title="Edit"
                                >
                                  <PencilIcon />
                                </button>
                                <button
                                  className={cn(iconButton, iconButtonDanger)}
                                  type="button"
                                  onClick={() => deleteNote(note.id)}
                                  aria-label="Delete note"
                                  title="Delete"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </li>
                          )
                        )}
                      </ul>
                      <Pagination page={notes!.page} pageCount={notes!.pageCount} onPage={setNotesPage} />
                    </div>
                  )}
                </>
              )}
            </section>

            <section className={card}>
              <h2 className={headingText}>Shared by me</h2>
              {byMe!.shares.length === 0 ? (
                <p className={cn("mt-3", mutedText)}>
                  You haven't shared anything yet. Use the share icon on a board, task, or note.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {byMe!.shares.map((entry) => (
                    <li
                      key={entry.shareId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3"
                    >
                      <div className="min-w-0">
                        <span className="block break-words text-sm font-medium text-gray-100">{entry.name}</span>
                        <span className="text-xs text-gray-500">
                          {entry.kind} · shared with {entry.friendEmail}
                        </span>
                      </div>
                      <Button variant="ghost" intent="danger" size="sm" onClick={() => unshare(entry)}>
                        Unshare
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {byMe && <Pagination page={byMe.page} pageCount={byMe.pageCount} onPage={setByMePage} />}
            </section>
          </>
        )}
      </main>
    </>
  );
}
