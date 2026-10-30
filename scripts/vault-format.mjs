// Pure formatting/merge logic for the vault sync script, kept separate from scripts/sync-vault.mjs
// (which does the network and filesystem I/O) so it can be unit tested with no DB or vault needed.

const PRIORITY_ORDER = ["high", "medium", "normal"];
const PRIORITY_LABEL = { high: "High priority", medium: "Medium priority", normal: "Normal priority" };

/** "2026-10-15 14:03" in local time, matching the format in README.md's vault-sync example. */
export function formatDateTime(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Renders one task line, with its board name in parentheses when it has one. */
function taskLine(task, boardNameById) {
  const box = task.completed ? "[x]" : "[ ]";
  const boardName = task.boardId ? boardNameById.get(task.boardId) : null;
  return boardName ? `- ${box} ${task.title} (${boardName})` : `- ${box} ${task.title}`;
}

function section(heading, tasks, boardNameById) {
  const lines = [`### ${heading}`, ""];
  if (tasks.length === 0) {
    lines.push("_Nothing here._");
  } else {
    for (const t of tasks) lines.push(taskLine(t, boardNameById));
  }
  return lines.join("\n");
}

/**
 * Renders the full contents of Tasks/To-do.md: active and done tasks, grouped by priority.
 * This file is fully regenerated on every run (per README.md), so there is no merge step.
 */
export function formatTasksMarkdown(tasks, boards) {
  const boardNameById = new Map((boards ?? []).map((b) => [b.id, b.name]));
  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  const byPriority = (list) =>
    PRIORITY_ORDER.map((p) =>
      section(PRIORITY_LABEL[p], list.filter((t) => t.priority === p), boardNameById)
    ).join("\n\n");

  return ["# To-do", "", "## Active", "", byPriority(active), "", "## Done", "", byPriority(done), ""].join("\n");
}

/** Matches a `<!-- note:ID -->...<!-- /note:ID -->` block anywhere in notes.md. */
const BLOCK_RE = /<!-- note:([^\s]+) -->[\s\S]*?<!-- \/note:\1 -->/g;

function findBlock(content, id) {
  BLOCK_RE.lastIndex = 0;
  for (const m of content.matchAll(BLOCK_RE)) {
    if (m[1] === id) return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** Renders one note's `<!-- note:ID -->...<!-- /note:ID -->` block, per the format in README.md. */
export function formatNoteBlock(note) {
  const lines = [`<!-- note:${note.id} -->`, `### ${formatDateTime(note.createdAt)}`];
  if (note.updatedAt !== note.createdAt) lines.push(`*Edited ${formatDateTime(note.updatedAt)}*`);
  lines.push("", note.body, `<!-- /note:${note.id} -->`);
  return lines.join("\n");
}

/**
 * Inserts or replaces one note's block in notes.md: in place if its id is already there,
 * otherwise appended at the end. Returns the unchanged content if the block is already
 * identical, so a caller can tell "nothing changed" apart from "content was rewritten".
 */
export function upsertNoteBlock(content, note) {
  const block = formatNoteBlock(note);
  const existing = findBlock(content, note.id);
  if (existing) {
    if (content.slice(existing.start, existing.end) === block) return content;
    return content.slice(0, existing.start) + block + content.slice(existing.end);
  }
  const trimmed = content.replace(/\s*$/, "");
  return trimmed.length === 0 ? block + "\n" : trimmed + "\n\n" + block + "\n";
}

/** Removes one note's block from notes.md, if present. Returns the unchanged content otherwise. */
export function removeNoteBlock(content, id) {
  const existing = findBlock(content, id);
  if (!existing) return content;
  // Also eat one adjacent blank-line separator so repeated deletions don't accumulate blank lines.
  let start = existing.start;
  let end = existing.end;
  if (content.slice(end, end + 2) === "\n\n") end += 2;
  else if (content.slice(end, end + 1) === "\n") end += 1;
  else if (content.slice(Math.max(0, start - 2), start) === "\n\n") start -= 2;
  return content.slice(0, start) + content.slice(end);
}

/**
 * Applies a notes-sync batch (new/edited notes to upsert, deleted ids to remove) to the current
 * notes.md content. Returns { content, changed } — changed is false when nothing needed writing,
 * so the caller can honor README.md's "If no block changed, the file is not written."
 */
export function applyNotesChanges(content, notes, deletedIds) {
  let next = content;
  for (const note of notes) next = upsertNoteBlock(next, note);
  for (const id of deletedIds) next = removeNoteBlock(next, id);
  return { content: next, changed: next !== content };
}
