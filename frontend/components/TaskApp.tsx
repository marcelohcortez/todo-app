"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AddTaskForm from "./AddTaskForm";
import Nav from "./Nav";
import { PRIORITIES } from "@/lib/types";
import type { Priority, Task } from "@/lib/types";

const LABEL: Record<Priority, string> = { high: "High", medium: "Medium", normal: "Normal" };

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

export default function TaskApp({ view }: { view: "active" | "done" }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [addOpen, setAddOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("normal");

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks?status=${view}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setTasks(data.tasks);
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  // The "+" on other pages links to /?add=1, which opens the add sheet here.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      setAddOpen(true);
      window.history.replaceState(null, "", "/");
    }
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function addTask(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    run(async () => {
      await api("/api/tasks", { method: "POST", body: JSON.stringify({ title: t, priority }) });
      setTitle("");
      setPriority("normal");
      setAddOpen(false);
    });
  }

  function toggle(task: Task) {
    run(() =>
      api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      })
    );
  }

  function remove(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    run(() => api(`/api/tasks/${task.id}`, { method: "DELETE" }));
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
  }

  function saveEdit(id: string) {
    const t = editTitle.trim();
    if (!t) return;
    run(async () => {
      await api(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: t, priority: editPriority }),
      });
      setEditingId(null);
    });
  }

  const emptyText =
    view === "active" ? "Nothing to do. Add a task above." : "No completed tasks yet.";

  return (
    <>
      <Nav current={view} onAdd={view === "active" ? () => setAddOpen(true) : undefined} />

      {view === "active" && addOpen && (
        <div className="sheet-backdrop" onClick={() => setAddOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="New task"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2>New task</h2>
              <button className="ghost" type="button" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
            </div>
            <AddTaskForm
              variant="sheet"
              autoFocus
              title={title}
              onTitleChange={setTitle}
              priority={priority}
              onPriorityChange={setPriority}
              onSubmit={addTask}
              onError={setError}
            />
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      <main className="container">
        {view === "active" && (
          <AddTaskForm
            variant="inline"
            title={title}
            onTitleChange={setTitle}
            priority={priority}
            onPriorityChange={setPriority}
            onSubmit={addTask}
            onError={setError}
          />
        )}

        {error && <p className="error">{error}</p>}

        {tasks === null ? (
          <p className="muted">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="muted">{emptyText}</p>
        ) : (
          <ul className="list">
            {tasks.map((task) =>
              editingId === task.id ? (
                <li key={task.id} className="item editing">
                  <div className="edit-row">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={500}
                      aria-label="Edit task title"
                      autoFocus
                    />
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as Priority)}
                      aria-label="Edit priority"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-buttons">
                    <button className="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(task.id)}>Save</button>
                  </div>
                </li>
              ) : (
                <li key={task.id} className={`item prio-${task.priority} ${task.completed ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    className="check"
                    checked={task.completed}
                    onChange={() => toggle(task)}
                    aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                  />
                  <div className="body">
                    <span className="title">{task.title}</span>
                    <div className="meta">
                      <span className={`badge ${task.priority}`}>{LABEL[task.priority]}</span>
                      <span>Added {fmt(task.createdAt)}</span>
                      {task.completedAt && <span>· Completed {fmt(task.completedAt)}</span>}
                    </div>
                  </div>
                  <div className="actions">
                    <button className="ghost" onClick={() => startEdit(task)}>
                      Edit
                    </button>
                    <button className="ghost danger" onClick={() => remove(task)}>
                      Delete
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </main>
    </>
  );
}
