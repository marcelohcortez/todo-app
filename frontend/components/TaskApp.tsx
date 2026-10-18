"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AddTaskForm, { NEW_BOARD } from "./AddTaskForm";
import BoardPills, { ALL } from "./BoardPills";
import DeleteBoardSheet from "./DeleteBoardSheet";
import type { BoardRemoval } from "./DeleteBoardSheet";
import NewBoardForm from "./NewBoardForm";
import Nav from "./Nav";
import { useLiveRefresh } from "./useLiveRefresh";
import { useToast } from "./Toast";
import { PRIORITIES } from "@/lib/types";
import type { Board, Priority, Task } from "@/lib/types";

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
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState("");
  const toast = useToast();

  // Board filter: ALL, or a board id.
  const [filter, setFilter] = useState(ALL);
  // The board the user asked to remove. Its confirmation sheet is open while this is set.
  const [boardToRemove, setBoardToRemove] = useState<Board | null>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  // The board chosen in the add form. Empty until the user picks one, then the first board is used.
  const [boardChoice, setBoardChoice] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  // Desktop: the inline add form is shown only after "+ New task" is clicked.
  const [inlineOpen, setInlineOpen] = useState(false);
  // The "+ New board" form. It is closed whenever the add-task form is open, and the reverse.
  const [boardFormOpen, setBoardFormOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("normal");
  const [editBoardId, setEditBoardId] = useState("");

  const load = useCallback(async () => {
    const [tasksRes, boardsRes] = await Promise.all([
      fetch(`/api/tasks?status=${view}`, { cache: "no-store" }),
      fetch("/api/boards", { cache: "no-store" }),
    ]);
    if (tasksRes.status === 401 || boardsRes.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await tasksRes.json();
    const boardData = await boardsRes.json();
    setTasks(data.tasks);
    setBoards(boardData.boards);
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

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

  // Resolves to true when the action succeeded. Errors are shown on the page and in a toast.
  // successMessage, when given, is shown in a toast after the action succeeds.
  async function run(action: () => Promise<unknown>, successMessage?: string): Promise<boolean> {
    setError("");
    try {
      await action();
      if (successMessage) toast(successMessage);
      await load();
      return true;
    } catch (err) {
      setError((err as Error).message);
      toast((err as Error).message, "error");
      return false;
    }
  }

  // "" until the user picks a board in the add form ("Select board" is shown until then).
  const addBoardId = boardChoice;

  function createBoard(name: string): Promise<boolean> {
    return run(async () => {
      const data = (await api("/api/boards", { method: "POST", body: JSON.stringify({ name }) })) as {
        board: Board;
      };
      setBoardChoice(data.board.id);
    }, "Board created");
  }

  function addTask(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    run(async () => {
      if (!addBoardId) throw new Error("Select a board for the task");
      let boardId = addBoardId;
      if (boardId === NEW_BOARD) {
        const name = newBoardName.trim();
        if (!name) throw new Error("Type a name for the new board");
        const data = (await api("/api/boards", { method: "POST", body: JSON.stringify({ name }) })) as {
          board: Board;
        };
        boardId = data.board.id;
      }
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: t, priority, boardId }),
      });
      setTitle("");
      setPriority("normal");
      setNewBoardName("");
      // Back to "Select board", so each task gets a board chosen on purpose.
      setBoardChoice("");
      setAddOpen(false);
      setInlineOpen(false);
    }, "Task added");
  }

  function toggle(task: Task) {
    run(
      () =>
        api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: !task.completed }),
        }),
      task.completed ? "Task reopened" : "Task completed"
    );
  }

  function remove(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    run(() => api(`/api/tasks/${task.id}`, { method: "DELETE" }), "Task deleted");
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditBoardId(task.boardId ?? "");
  }

  function saveEdit(id: string) {
    const t = editTitle.trim();
    if (!t) return;
    run(async () => {
      await api(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: t, priority: editPriority, boardId: editBoardId || null }),
      });
      setEditingId(null);
    }, "Task updated");
  }

  // Renames a board. A name another board already uses is refused by the server, and the error is shown in a toast.
  function renameBoardNow(board: Board, name: string) {
    run(() => api(`/api/boards/${board.id}`, { method: "PATCH", body: JSON.stringify({ name }) }), "Board renamed");
  }

  // Removes a board and its tasks, or moves the tasks first. Resolves to an error message, or null on success.
  async function removeBoardNow(board: Board, removal: BoardRemoval): Promise<string | null> {
    try {
      await api(`/api/boards/${board.id}`, { method: "DELETE", body: JSON.stringify(removal) });
    } catch (err) {
      toast((err as Error).message, "error");
      return (err as Error).message;
    }
    toast(`Board "${board.name}" removed`);
    setBoardToRemove(null);
    if (filter === board.id) setFilter(ALL);
    await load();
    return null;
  }

  // The list the pills choose from. The filter is applied here, on the tasks already loaded.
  const visible = (tasks ?? []).filter((t) => filter === ALL || t.boardId === filter);

  const boardName = (id: string | null) => boards.find((b) => b.id === id)?.name;

  const emptyText =
    view === "active" ? "Nothing to do. Add a task above." : "No completed tasks yet.";

  return (
    <>
      <Nav current={view} onAddTask={view === "active" ? () => setAddOpen(true) : undefined} />

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
              boards={boards}
              boardId={addBoardId}
              onBoardChange={setBoardChoice}
              newBoardName={newBoardName}
              onNewBoardNameChange={setNewBoardName}
              onSubmit={addTask}
              onError={setError}
            />
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {boardToRemove && (
        <DeleteBoardSheet
          board={boardToRemove}
          otherBoards={boards.filter((b) => b.id !== boardToRemove.id)}
          onCancel={() => setBoardToRemove(null)}
          onConfirm={(removal) => removeBoardNow(boardToRemove, removal)}
        />
      )}

      <main className="container">
        {view === "active" && (
          <NewBoardForm
            onCreate={createBoard}
            open={boardFormOpen}
            // Only one of the two forms is open at a time.
            onOpen={() => {
              setInlineOpen(false);
              setBoardFormOpen(true);
            }}
            onClose={() => setBoardFormOpen(false)}
            before={
              <button
                className="ghost new-task-toggle"
                type="button"
                onClick={() => {
                  setBoardFormOpen(false);
                  setInlineOpen((open) => !open);
                }}
                aria-expanded={inlineOpen}
              >
                {inlineOpen ? "Cancel" : "+ New task"}
              </button>
            }
          />
        )}

        {view === "active" && inlineOpen && (
          <AddTaskForm
            variant="inline"
            title={title}
            onTitleChange={setTitle}
            priority={priority}
            onPriorityChange={setPriority}
            boards={boards}
            boardId={addBoardId}
            onBoardChange={setBoardChoice}
            newBoardName={newBoardName}
            onNewBoardNameChange={setNewBoardName}
            onSubmit={addTask}
            onError={setError}
          />
        )}

        {error && <p className="error">{error}</p>}

        {tasks !== null && (
          <BoardPills
            boards={boards}
            value={filter}
            onChange={setFilter}
            onRemove={setBoardToRemove}
            onRename={renameBoardNow}
          />
        )}

        {tasks === null ? (
          <p className="muted">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="muted">{emptyText}</p>
        ) : visible.length === 0 ? (
          <p className="muted">No tasks on this board.</p>
        ) : (
          <ul className="list">
            {visible.map((task) =>
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
                      value={editBoardId}
                      onChange={(e) => setEditBoardId(e.target.value)}
                      aria-label="Edit board"
                    >
                      <option value="">No board</option>
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
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
                      {boardName(task.boardId) && <span className="board-tag">{boardName(task.boardId)}</span>}
                      <span className={`badge ${task.priority}`}>{LABEL[task.priority]}</span>
                      <span>Added {fmt(task.createdAt)}</span>
                      {task.completedAt && <span>· Completed {fmt(task.completedAt)}</span>}
                    </div>
                    <div className="item-actions">
                      <button
                        className="icon-btn"
                        type="button"
                        onClick={() => startEdit(task)}
                        aria-label={`Edit "${task.title}"`}
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
                        onClick={() => remove(task)}
                        aria-label={`Delete "${task.title}"`}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
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
