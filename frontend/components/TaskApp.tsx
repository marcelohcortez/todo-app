"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import AddTaskForm, { NEW_BOARD } from "./AddTaskForm";
import BoardPills, { ALL } from "./BoardPills";
import DeleteBoardSheet from "./DeleteBoardSheet";
import type { BoardRemoval } from "./DeleteBoardSheet";
import MicButton from "./MicButton";
import NewBoardForm from "./NewBoardForm";
import Pagination from "./Pagination";
import SearchBar from "./SearchBar";
import Nav from "./Nav";
import ShareSheet from "./ShareSheet";
import { useLiveRefresh } from "./useLiveRefresh";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import Sheet from "./ui/Sheet";
import { cn } from "./ui/cn";
import Spinner from "./ui/Spinner";
import { PencilIcon, ShareIcon, TrashIcon } from "./ui/icons";
import { badgeClass, errorText, field, iconButton, iconButtonDanger, mutedText, pageMain } from "./ui/styles";
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

  // Board filter: ALL, or a board id. The server filters, so the page count and the items match.
  const [filter, setFilter] = useState(ALL);
  // Which page of 20 tasks is shown, how many pages there are, and how many tasks match in all.
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  // The text the list is searched for. "" shows everything. `searching` is true while that search loads.
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  // The board the user asked to remove. Its confirmation sheet is open while this is set.
  const [boardToRemove, setBoardToRemove] = useState<Board | null>(null);
  // The board or task the user asked to share. Its share sheet is open while this is set.
  const [sharing, setSharing] = useState<{ kind: "board" | "task"; id: string; label: string } | null>(null);

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

  // Tasks whose completion is being saved. They stay dimmed until the list has reloaded without them.
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("normal");
  const [editBoardId, setEditBoardId] = useState("");
  // Text typed before dictation starts is kept; the spoken words are added after it.
  const editSpokenPrefix = useRef("");

  const load = useCallback(async () => {
    const boardQuery = filter === ALL ? "" : `&boardId=${filter}`;
    const searchParam = query ? `&q=${encodeURIComponent(query)}` : "";
    try {
      const [tasksRes, boardsRes] = await Promise.all([
        fetch(`/api/tasks?status=${view}&page=${page}${boardQuery}${searchParam}`, { cache: "no-store" }),
        fetch("/api/boards", { cache: "no-store" }),
      ]);
      if (tasksRes.status === 401 || boardsRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await tasksRes.json();
      const boardData = await boardsRes.json();
      setTasks(data.tasks);
      setTotal(data.total);
      setPageCount(data.pageCount);
      // The server moves a page that no longer exists (for example, the last item was removed) to the last page.
      setPage(data.page);
      setBoards(boardData.boards);
    } finally {
      setSearching(false);
    }
  }, [view, filter, page, query]);

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
    setPendingIds((ids) => [...ids, task.id]);
    run(
      () =>
        api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completed: !task.completed }),
        }),
      task.completed ? "Task reopened" : "Task completed"
    ).finally(() => setPendingIds((ids) => ids.filter((id) => id !== task.id)));
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

  // A new search starts from the first page. Called by SearchBar after typing pauses.
  function search(text: string) {
    setSearching(true);
    setQuery(text);
    setPage(1);
  }

  const boardName = (id: string | null) => boards.find((b) => b.id === id)?.name;

  const emptyText =
    view === "active" ? "Nothing to do. Add a task above." : "Nothing completed in the last 30 days.";

  return (
    <>
      {pendingIds.length > 0 && (
        <div role="progressbar" aria-label="Saving changes" className="fixed inset-x-0 top-0 z-50 h-0.5 bg-primary-500/20">
          <div className="h-full w-full animate-pulse bg-primary-500" />
        </div>
      )}

      <Nav current={view} onAddTask={view === "active" ? () => setAddOpen(true) : undefined} />

      {view === "active" && addOpen && (
        <Sheet label="New task" title="New task" onClose={() => setAddOpen(false)}>
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
          {error && <p className={cn("mt-3", errorText)}>{error}</p>}
        </Sheet>
      )}

      {boardToRemove && (
        <DeleteBoardSheet
          board={boardToRemove}
          otherBoards={boards.filter((b) => b.id !== boardToRemove.id)}
          onCancel={() => setBoardToRemove(null)}
          onConfirm={(removal) => removeBoardNow(boardToRemove, removal)}
        />
      )}

      {sharing && (
        <ShareSheet kind={sharing.kind} itemId={sharing.id} itemLabel={sharing.label} onClose={() => setSharing(null)} />
      )}

      <main className={pageMain}>
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
              <Button
                variant="soft"
                size="sm"
                type="button"
                onClick={() => {
                  setBoardFormOpen(false);
                  setInlineOpen((open) => !open);
                }}
                aria-expanded={inlineOpen}
              >
                {inlineOpen ? "Cancel" : "+ New task"}
              </Button>
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

        {error && <p className={cn("mt-3", errorText)}>{error}</p>}

        {tasks !== null && (
          <BoardPills
            boards={boards}
            value={filter}
            onChange={(board) => {
              setFilter(board);
              setPage(1);
            }}
            onRemove={setBoardToRemove}
            onRename={renameBoardNow}
            onShare={(board) => setSharing({ kind: "board", id: board.id, label: board.name })}
          />
        )}

        <SearchBar label={view === "active" ? "Search tasks" : "Search completed tasks"} onSearch={search} />

        {searching ? (
          <div className="mt-8 flex justify-center">
            <Spinner label="Searching" />
          </div>
        ) : tasks === null ? (
          <p className={cn("mt-4", mutedText)}>Loading…</p>
        ) : total === 0 ? (
          <p className={cn("mt-4", mutedText)}>
            {query ? `No tasks match "${query}".` : filter === ALL ? emptyText : "No tasks on this board."}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {tasks.map((task) =>
              editingId === task.id ? (
                <li key={task.id} className="item rounded-xl border border-primary-500/40 bg-gray-900 p-4 shadow-lg shadow-black/20">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="flex items-center gap-2 sm:col-span-3">
                      <input
                        className={field}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={500}
                        aria-label="Edit task title"
                        autoFocus
                      />
                      <MicButton
                        onStart={() => {
                          editSpokenPrefix.current = editTitle.trim() ? `${editTitle.trimEnd()} ` : "";
                        }}
                        onResult={(text) => setEditTitle((editSpokenPrefix.current + text).slice(0, 500))}
                        onError={setError}
                      />
                    </div>
                    <select
                      className={field}
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
                      className={field}
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
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="ghost" intent="gray" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(task.id)}>
                      Save
                    </Button>
                  </div>
                </li>
              ) : (
                <li
                  key={task.id}
                  aria-busy={pendingIds.includes(task.id)}
                  className={cn(
                    "item group relative flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3.5 shadow-lg shadow-black/10 transition hover:border-gray-700",
                    pendingIds.includes(task.id) && "opacity-50"
                  )}
                >
                  {pendingIds.includes(task.id) && (
                    <span
                      role="status"
                      aria-label="Saving"
                      className="pointer-events-none absolute left-3.5 top-3.5 size-5 animate-spin rounded-full border-2 border-gray-600 border-t-primary-400"
                    />
                  )}
                  <input
                    type="checkbox"
                    className="check"
                    checked={task.completed}
                    disabled={pendingIds.includes(task.id)}
                    onChange={() => toggle(task)}
                    aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                  />
                  <div className="min-w-0 flex-1">
                    <span className={cn("block break-words text-base text-gray-100", task.completed && "text-gray-500 line-through")}>
                      {task.title}
                    </span>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-gray-500">
                      {boardName(task.boardId) && <span className={badgeClass("board")}>{boardName(task.boardId)}</span>}
                      <span className={badgeClass(task.priority)}>{LABEL[task.priority]}</span>
                      <span>Added {fmt(task.createdAt)}</span>
                      {task.completedAt && <span>· Completed {fmt(task.completedAt)}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      className={iconButton}
                      type="button"
                      onClick={() => startEdit(task)}
                      aria-label={`Edit "${task.title}"`}
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      className={iconButton}
                      type="button"
                      onClick={() => setSharing({ kind: "task", id: task.id, label: task.title })}
                      aria-label={`Share "${task.title}"`}
                      title="Share"
                    >
                      <ShareIcon />
                    </button>
                    <button
                      className={cn(iconButton, iconButtonDanger)}
                      type="button"
                      onClick={() => remove(task)}
                      aria-label={`Delete "${task.title}"`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}

        {tasks !== null && !searching && total > 0 && (
          <Pagination page={page} pageCount={pageCount} onPage={setPage} />
        )}
      </main>
    </>
  );
}
