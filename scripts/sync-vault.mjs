// Copies tasks and notes into an Obsidian vault. See README.md, "Sync tasks and notes to your
// vault", for the full spec this implements. Node built-ins only (needs Node 18.14+ for
// Headers.getSetCookie). Run with: node scripts/sync-vault.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatTasksMarkdown, applyNotesChanges } from "./vault-format.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(SCRIPT_DIR, ".env.sync");
const SYNC_STATE_PATH = path.join(SCRIPT_DIR, ".notes-sync.json");

/** A minimal KEY=VALUE parser for .env.sync — no quoting or interpolation, just what README.md documents. */
function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function loadConfig() {
  const text = await readFile(ENV_PATH, "utf8").catch(() => {
    throw new Error(`Missing ${ENV_PATH}. Create it per README.md's "Settings" section.`);
  });
  const env = parseEnvFile(text);
  for (const key of ["TODO_API_URL", "TODO_EMAIL", "TODO_PASSWORD", "VAULT_DIR"]) {
    if (!env[key]) throw new Error(`${ENV_PATH} is missing ${key}.`);
  }
  return {
    apiUrl: env.TODO_API_URL.replace(/\/$/, ""),
    email: env.TODO_EMAIL,
    password: env.TODO_PASSWORD,
    vaultDir: env.VAULT_DIR,
  };
}

/** Logs in and returns the Cookie header value to send on every later request. */
async function login(apiUrl, email, password) {
  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Login failed (${res.status}): ${body.error ?? res.statusText}`);
  }
  const cookies = res.headers.getSetCookie();
  const session = cookies.find((c) => c.startsWith("session="));
  if (!session) throw new Error("Login succeeded but no session cookie was returned.");
  return session.split(";")[0];
}

async function apiGet(apiUrl, cookie, pathAndQuery) {
  const res = await fetch(`${apiUrl}${pathAndQuery}`, { headers: { cookie } });
  if (!res.ok) throw new Error(`GET ${pathAndQuery} failed (${res.status}): ${res.statusText}`);
  return res.json();
}

async function readFileOrEmpty(filePath) {
  return readFile(filePath, "utf8").catch((err) => {
    if (err.code === "ENOENT") return "";
    throw err;
  });
}

async function readSyncState() {
  const text = await readFile(SYNC_STATE_PATH, "utf8").catch((err) => {
    if (err.code === "ENOENT") return null;
    throw err;
  });
  return text ? JSON.parse(text).since : undefined;
}

/** Fetches every task across all pages of GET /api/tasks for one status filter. */
async function fetchAllTasks(apiUrl, cookie, status) {
  const tasks = [];
  let page = 1;
  for (;;) {
    const data = await apiGet(apiUrl, cookie, `/api/tasks?status=${status}&page=${page}`);
    tasks.push(...data.tasks);
    if (page >= data.pageCount) break;
    page += 1;
  }
  return tasks;
}

/** Rewrites Tasks/To-do.md from scratch. Per README.md this file is fully overwritten every run. */
async function syncTasks(apiUrl, cookie, vaultDir) {
  const [tasks, boardsData] = await Promise.all([
    fetchAllTasks(apiUrl, cookie, "all"),
    apiGet(apiUrl, cookie, "/api/boards"),
  ]);
  const filePath = path.join(vaultDir, "Tasks", "To-do.md");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, formatTasksMarkdown(tasks, boardsData.boards), "utf8");
  return tasks.length;
}

/**
 * Applies new/edited/deleted notes since the last run to 00Inbox/notes.md, then advances the
 * sync checkpoint — but only once the file write has actually succeeded, so a failed run is
 * retried in full next time (per README.md).
 */
async function syncNotes(apiUrl, cookie, vaultDir) {
  const since = await readSyncState();
  const { notes, deleted, serverTime } = await apiGet(
    apiUrl,
    cookie,
    `/api/notes/sync${since ? `?since=${encodeURIComponent(since)}` : ""}`
  );

  const filePath = path.join(vaultDir, "00Inbox", "notes.md");
  const current = await readFileOrEmpty(filePath);
  const { content, changed } = applyNotesChanges(current, notes, deleted);

  if (changed) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
  await writeFile(SYNC_STATE_PATH, JSON.stringify({ since: serverTime }), "utf8");
  return { added: notes.length, deleted: deleted.length, changed };
}

async function main() {
  const { apiUrl, email, password, vaultDir } = await loadConfig();
  const cookie = await login(apiUrl, email, password);

  const taskCount = await syncTasks(apiUrl, cookie, vaultDir);
  console.log(`Tasks/To-do.md: wrote ${taskCount} task(s).`);

  const notesResult = await syncNotes(apiUrl, cookie, vaultDir);
  console.log(
    notesResult.changed
      ? `00Inbox/notes.md: applied ${notesResult.added} note(s) and ${notesResult.deleted} deletion(s).`
      : "00Inbox/notes.md: no changes."
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
