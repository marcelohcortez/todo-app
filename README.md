# Tasks

A to-do app with email/password login (kept for one year), priorities (High, Medium, Normal),
a Done page, and an MCP endpoint so an AI client can manage your tasks.

Stack: Next.js 14 (App Router), TypeScript, MongoDB.

## Layout

The app is split into two independent Next.js projects. Each one deploys to its own Vercel project.

| Folder      | What it is                                                        | Vercel root directory |
| ----------- | ----------------------------------------------------------------- | --------------------- |
| `frontend/` | Pages and components (login, tasks, done, settings) and styles    | `frontend`            |
| `backend/`  | API routes (`/api/*`), MongoDB access, sessions, MCP endpoint      | `backend`             |

The look of the app (colours, radii, spacing and shared components) is defined in
`frontend/app/design-system.css`. See `frontend/DESIGN.md` before changing styles.

The browser only talks to the frontend. Its `next.config.mjs` forwards `/api/*` to the backend, so the
session cookie is first-party and no CORS setup is needed.

## Run locally

Run each project in its own terminal.

1. Backend (port 3001):

   ```bash
   cd backend
   cp .env.example .env.local   # fill in MONGODB_URI and AUTH_SECRET, ALLOW_SIGNUP=true for the first run
   npm install
   npm run dev -- -p 3001
   ```

2. Frontend (port 3000):

   ```bash
   cd frontend
   cp .env.example .env.local   # BACKEND_URL=http://localhost:3001
   npm install
   npm run dev
   ```

3. Open http://localhost:3000, click **Create one**, and register.
4. Set `ALLOW_SIGNUP=false` in the backend's environment so nobody else can register.

## Deploy to Vercel

Create two Vercel projects from the same GitHub repo.

**Backend project**

1. Root directory: `backend`.
2. Environment variables: `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`, `ALLOW_SIGNUP`, and `PUBLIC_URL`
   = the **frontend** URL (no trailing slash). `PUBLIC_URL` is used for the OAuth sign-in for claude.ai.
   Optional: `ALLOWED_REDIRECT_HOSTS` = extra AI callback hosts that may connect, comma-separated
   (for example `chatgpt.com`). `claude.ai` and `claude.com` are always allowed.
3. Deploy. Note its URL, for example `https://todo-api.vercel.app`.

**Frontend project**

1. Root directory: `frontend`.
2. Environment variables: `BACKEND_URL` = the backend URL from above (no trailing slash).
   It is read at build time, so redeploy the frontend if the backend URL changes.
3. Deploy.

In MongoDB Atlas, allow network access only from the addresses that need it. Do not open the database to all
addresses (`0.0.0.0/0`). See Atlas's network access docs for the options.

Use the **frontend** URL to open the app and for MCP (below). The backend URL works for the API directly.

## Install on your phone

The web app is a PWA, so it installs without an app store. Open your frontend URL in the phone's browser:

- **Android (Chrome):** menu (⋮) → **Install app** (or **Add to Home screen**).
- **iPhone (Safari):** Share → **Add to Home Screen**.

It opens full screen with its own icon. The web version is the same app, and nothing is cached: tasks and
sign-in always come from the server.

## Connect claude.ai (web)

1. In claude.ai, go to **Settings → Connectors → Add custom connector**.
2. URL: `https://YOUR-FRONTEND.vercel.app/api/mcp`
3. Claude opens a sign-in page on your app. Log in if asked, then click **Allow**.

Access lasts 90 days. The **Connected apps** section in Settings lists every app connected with sign-in
and lets you **Disconnect** one. Clicking **Revoke token** disconnects all of them, plus any client using the personal token.

## Connect Claude Code or Claude Desktop via MCP

1. Log in, go to **Settings**, click **Create token**, and copy it. It is shown once.
2. Point your MCP client at the endpoint with a Bearer header:

   ```json
   {
     "mcpServers": {
       "todo": {
         "type": "http",
         "url": "https://YOUR-FRONTEND.vercel.app/api/mcp",
         "headers": { "Authorization": "Bearer tdk_..." }
       }
     }
   }
   ```

Tools: `list_tasks`, `create_task`, `update_task`, `set_task_completed`, `delete_task`.
Task objects include `createdAt` and `completedAt`.

## Sync tasks to your vault (to implement later)

Goal: copy your tasks into a Markdown note inside an Obsidian vault, so the vault can use them.
Nothing in this section is implemented yet. It is the plan and the code to add.

**How it works**

1. `scripts/sync-vault.mjs` (below) signs in to the backend with `POST /api/auth/login` and
   `{ "email", "password" }`. The backend answers with a `session` cookie.
2. It calls `GET /api/tasks?status=all` with that cookie. The response is `{ "tasks": [...] }`. Each task has
   `title`, `priority` (`high`, `medium` or `normal`), `completed`, `createdAt` and `completedAt`.
3. It writes `<VAULT_DIR>/Tasks/To-do.md`, overwriting the file each time. The note is one-way: change
   tasks in the app, not in the note.

The script uses only Node built-ins, so it needs Node 18.14 or newer (for `Headers.getSetCookie`).

**Files to add**

- `scripts/sync-vault.mjs`: the script below.
- `scripts/.env.sync`: your settings. Git-ignored, so add `scripts/.env.sync` to `.gitignore`.

`scripts/.env.sync` (fill in your values):

```env
# Backend URL from Vercel (no trailing slash)
TODO_API_URL=https://YOUR-BACKEND.vercel.app
# The login you use in the app
TODO_EMAIL=you@example.com
TODO_PASSWORD=your-password
# Vault folder. The note goes to <VAULT_DIR>\Tasks\To-do.md
VAULT_DIR=C:\Path\To\MyVault
```

`scripts/sync-vault.mjs`:

```js
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(here, ".env.sync");

// Reads KEY=VALUE lines from scripts/.env.sync. Real environment variables win.
async function loadEnvFile() {
  if (!existsSync(ENV_FILE)) return;
  for (const line of (await readFile(ENV_FILE, "utf8")).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it in scripts/.env.sync.`);
  return value;
}

const PRIORITY_ORDER = ["high", "medium", "normal"];
const PRIORITY_LABEL = { high: "High", medium: "Medium", normal: "Normal" };
const day = (iso) => (iso ? iso.slice(0, 10) : "");

function renderNote(tasks, syncedAt) {
  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  const lines = [
    "# To-do",
    "",
    `> Generated by scripts/sync-vault.mjs at ${syncedAt}. Edits here are overwritten on the next sync. Change tasks in the app.`,
    "",
    `Active: ${active.length} · Done: ${done.length}`,
    "",
    "## Active",
    "",
  ];
  for (const priority of PRIORITY_ORDER) {
    const group = active.filter((t) => t.priority === priority);
    if (group.length === 0) continue;
    lines.push(`### ${PRIORITY_LABEL[priority]}`, "");
    for (const t of group) lines.push(`- [ ] ${t.title} (added ${day(t.createdAt)})`);
    lines.push("");
  }
  if (active.length === 0) lines.push("No active tasks.", "");
  lines.push("## Done", "");
  for (const t of done) lines.push(`- [x] ${t.title} (done ${day(t.completedAt)})`);
  if (done.length === 0) lines.push("No finished tasks yet.");
  return lines.join("\n") + "\n";
}

async function signIn(apiUrl, email, password) {
  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Sign-in failed (HTTP ${res.status}). Check TODO_EMAIL and TODO_PASSWORD.`);
  const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const session = setCookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("session="));
  if (!session) throw new Error("Sign-in worked but no session cookie was returned.");
  return session;
}

async function fetchTasks(apiUrl, cookie) {
  const res = await fetch(`${apiUrl}/api/tasks?status=all`, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`Could not load tasks (HTTP ${res.status}).`);
  return (await res.json()).tasks;
}

async function main() {
  await loadEnvFile();
  const apiUrl = requireEnv("TODO_API_URL").replace(/\/+$/, "");
  const cookie = await signIn(apiUrl, requireEnv("TODO_EMAIL"), requireEnv("TODO_PASSWORD"));
  const tasks = await fetchTasks(apiUrl, cookie);

  const outDir = path.join(requireEnv("VAULT_DIR"), "Tasks");
  const outFile = path.join(outDir, "To-do.md");
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, renderNote(tasks, new Date().toLocaleString("en-GB", { hour12: false })), "utf8");
  console.log(`Synced ${tasks.length} tasks to ${outFile}`);
}

main().catch((err) => {
  console.error(`Sync failed: ${err.message}`);
  process.exitCode = 1;
});
```

**Steps**

1. Create `scripts/sync-vault.mjs` and `scripts/.env.sync` as above, and add `scripts/.env.sync` to `.gitignore`.
2. Test once from the repo root: `node scripts/sync-vault.mjs`. Expected output:
   `Synced N tasks to ...\Tasks\To-do.md`. Open the note in Obsidian to check it.
3. Schedule it on Windows: **Task Scheduler** → **Create Basic Task**.
   - Trigger: **Daily** (or **When I log on**). To repeat, edit the trigger and set **Repeat task every** to 1 hour.
   - Action: **Start a program**.
   - Program/script: the full path to `node.exe` (run `where node` to find it).
   - Add arguments: `<path to repo>\scripts\sync-vault.mjs`
   - Start in: `<path to repo>\scripts`

**Troubleshooting**

- `Sign-in failed (HTTP 401)`: wrong `TODO_EMAIL` or `TODO_PASSWORD`.
- `Missing TODO_...`: the value is missing from `scripts/.env.sync`.
- Network errors: `TODO_API_URL` must be the **backend** URL, not the frontend.

## Notes

- On phones, a bottom bar gives quick access to To do, Done, Settings and Log out. The centre **+** opens
  the new-task pop-up (text, microphone, priority and Add). On desktop, the top menu and the inline
  form are used instead.
- Voice input: tap the microphone in the new-task field and speak. The words fill the field so you can
  edit them before adding. It uses the browser's speech recognition, so Chrome on Android works best.
  The browser sends the audio to its speech service (Google, in Chrome). The button is hidden in browsers
  without speech recognition.

- Sessions are signed JWTs in an httpOnly cookie that lasts one year. Changing `AUTH_SECRET` logs everyone out.
  The secret lives only in the backend project.
- Passwords are hashed with bcrypt. MCP tokens are stored only as SHA-256 hashes.
