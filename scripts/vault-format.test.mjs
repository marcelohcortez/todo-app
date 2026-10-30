// Run with: node --test scripts/vault-format.test.mjs
// Uses Node's built-in test runner, not Vitest, since this script intentionally has no
// dependencies (Node built-ins only — see README.md's vault-sync section).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatDateTime,
  formatNoteBlock,
  upsertNoteBlock,
  removeNoteBlock,
  applyNotesChanges,
  formatTasksMarkdown,
} from "./vault-format.mjs";

const NOTE = {
  id: "665f1c2a9b7e4d3a2c1b0e9f",
  body: "Buy milk and check the boiler.",
  createdAt: "2026-10-15T14:03:00.000Z",
  updatedAt: "2026-10-15T14:03:00.000Z",
};

// formatDateTime renders in the machine's local time (right for a personal vault), so expected
// strings here are built the same way rather than hardcoded against one timezone.
function expectedLocal(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test("formatDateTime renders the README's example format", () => {
  assert.equal(formatDateTime("2026-10-15T14:03:00.000Z"), expectedLocal("2026-10-15T14:03:00.000Z"));
  assert.match(formatDateTime("2026-10-15T14:03:00.000Z"), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
});

test("formatNoteBlock omits the Edited line when updatedAt equals createdAt", () => {
  const block = formatNoteBlock(NOTE);
  assert.ok(block.startsWith(`<!-- note:${NOTE.id} -->`));
  assert.ok(block.endsWith(`<!-- /note:${NOTE.id} -->`));
  assert.ok(!block.includes("*Edited"));
  assert.ok(block.includes(NOTE.body));
});

test("formatNoteBlock includes the Edited line when updatedAt differs", () => {
  const edited = { ...NOTE, updatedAt: "2026-10-16T09:12:00.000Z" };
  const block = formatNoteBlock(edited);
  assert.ok(block.includes(`*Edited ${expectedLocal(edited.updatedAt)}*`));
});

test("upsertNoteBlock appends a new note to an empty file", () => {
  const result = upsertNoteBlock("", NOTE);
  assert.ok(result.includes(`<!-- note:${NOTE.id} -->`));
});

test("upsertNoteBlock appends after existing content, separated by a blank line", () => {
  const existing = formatNoteBlock({ ...NOTE, id: "aaa" });
  const result = upsertNoteBlock(existing, { ...NOTE, id: "bbb" });
  assert.equal(result, existing + "\n\n" + formatNoteBlock({ ...NOTE, id: "bbb" }) + "\n");
});

test("upsertNoteBlock replaces an existing block in place, keeping its position", () => {
  const before = formatNoteBlock({ ...NOTE, id: "aaa" });
  const after = formatNoteBlock({ ...NOTE, id: "bbb" });
  const content = before + "\n\n" + after + "\n";
  const editedA = { ...NOTE, id: "aaa", body: "Edited text." };
  const result = upsertNoteBlock(content, editedA);
  assert.ok(result.startsWith(formatNoteBlock(editedA)));
  assert.ok(result.includes(after));
});

test("upsertNoteBlock is a no-op (returns the same content) when the block is already identical", () => {
  const content = upsertNoteBlock("", NOTE);
  const result = upsertNoteBlock(content, NOTE);
  assert.equal(result, content);
});

test("removeNoteBlock deletes a block and its separator, leaving other blocks intact", () => {
  const a = formatNoteBlock({ ...NOTE, id: "aaa" });
  const b = formatNoteBlock({ ...NOTE, id: "bbb" });
  const content = a + "\n\n" + b + "\n";
  const result = removeNoteBlock(content, "aaa");
  assert.equal(result, b + "\n");
});

test("removeNoteBlock is a no-op when the id isn't present", () => {
  const content = upsertNoteBlock("", NOTE);
  assert.equal(removeNoteBlock(content, "does-not-exist"), content);
});

test("applyNotesChanges reports changed:false when nothing was added, edited or deleted", () => {
  const content = upsertNoteBlock("", NOTE);
  const result = applyNotesChanges(content, [], []);
  assert.equal(result.changed, false);
  assert.equal(result.content, content);
});

test("applyNotesChanges reports changed:false when the only note given is already identical", () => {
  const content = upsertNoteBlock("", NOTE);
  const result = applyNotesChanges(content, [NOTE], []);
  assert.equal(result.changed, false);
});

test("applyNotesChanges upserts new/edited notes and removes deleted ones in one pass", () => {
  const starting = upsertNoteBlock("", { ...NOTE, id: "stale" });
  const result = applyNotesChanges(starting, [{ ...NOTE, id: "fresh" }], ["stale"]);
  assert.equal(result.changed, true);
  assert.ok(result.content.includes("note:fresh"));
  assert.ok(!result.content.includes("note:stale"));
});

test("formatTasksMarkdown groups tasks by priority under Active and Done", () => {
  const tasks = [
    { title: "Fix bug", priority: "high", completed: false, boardId: "b1" },
    { title: "Write docs", priority: "normal", completed: false, boardId: null },
    { title: "Old task", priority: "medium", completed: true, boardId: null },
  ];
  const boards = [{ id: "b1", name: "Work" }];
  const md = formatTasksMarkdown(tasks, boards);

  assert.ok(md.includes("## Active"));
  assert.ok(md.includes("## Done"));
  assert.ok(md.includes("- [ ] Fix bug (Work)"));
  assert.ok(md.includes("- [ ] Write docs"));
  assert.ok(md.includes("- [x] Old task"));
});

test("formatTasksMarkdown marks empty priority groups instead of omitting them silently", () => {
  const md = formatTasksMarkdown([], []);
  assert.ok(md.includes("_Nothing here._"));
});
