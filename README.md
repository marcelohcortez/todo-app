# Keeptrack

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
3. Deploy. Note its URL, for example `https://keeptrack-api.vercel.app`.

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

Tools: `list_boards`, `list_tasks`, `create_task`, `update_task`, `set_task_completed`, `delete_task`.
Task objects include `boardId`, `createdAt` and `completedAt`. `list_boards` returns each board's name and
task counts (active, done and total). `list_tasks` takes `boardId` (or `"none"` for tasks without a board),
and `create_task` and `update_task` take `boardId`.

## Sync tasks and notes to your vault (to implement later)

Nothing in this section is implemented yet, apart from the notes endpoint below, which the app already has.
It is the plan for a script that copies your tasks and notes into an Obsidian vault. When you build it, the
script goes in `scripts/sync-vault.mjs` and is run with Node.

**What the vault gets**

| File in the vault | What it holds | Who writes it |
| ----------------- | ------------- | ------------- |
| `Tasks/To-do.md` | Active and done tasks, grouped by priority | The script, on every run. Edits here are overwritten. |
| `00Inbox/notes.md` | One block per note | The script only. Do not edit it by hand. |

Later, an AI will read `00Inbox/notes.md` and organise the notes inside the vault. That is outside this script.

**How notes are written to `00Inbox/notes.md`**

Each note sits between two marker lines that carry its id:

```markdown
<!-- note:665f1c2a9b7e4d3a2c1b0e9f -->
### 2026-10-15 14:03
*Edited 2026-10-16 09:12*

Buy milk and check the boiler.
<!-- /note:665f1c2a9b7e4d3a2c1b0e9f -->
```

The heading uses `createdAt`. The `*Edited ...*` line appears only when `updatedAt` differs from `createdAt`.

Each run should do only this:

| What changed in the app | What the script does to `notes.md` |
| ----------------------- | ---------------------------------- |
| A new note | Adds its block at the end of the file |
| An edited note | Replaces its block in place |
| A deleted note | Removes its block |
| Nothing | Writes nothing. If no block changed, the file is not written. |

Blocks are matched by id, not by position. If the AI has moved a note out of the inbox, the script leaves it
there unless that note changes in the app. Then it adds a new block to the inbox.

**How the script should get changes**

It signs in with `POST /api/auth/login` (`{ "email", "password" }`) and keeps the `session` cookie. Then:

1. Read the last sync time from `scripts/.notes-sync.json` (`{ "since": "<ISO time>" }`). If the file is missing, use no `since`.
2. Call `GET /api/notes/sync?since=<since>`. It returns `{ notes, deleted, serverTime }`.
3. Apply the rules above to `00Inbox/notes.md`.
4. Write `serverTime` to `scripts/.notes-sync.json`, but only after the file has been written. A failed run is then retried in full next time.

`scripts/.notes-sync.json` should be git-ignored, and so should `scripts/.env.sync`.

**Settings**

`scripts/.env.sync`, to create when you build it:

```env
# Backend URL from Vercel (no trailing slash). Use the backend, not the frontend.
TODO_API_URL=https://YOUR-BACKEND.vercel.app
# The login you use in the app
TODO_EMAIL=you@example.com
TODO_PASSWORD=your-password
# Your vault folder. Tasks go to <VAULT_DIR>\Tasks\To-do.md and notes to <VAULT_DIR>\00Inbox\notes.md
VAULT_DIR=C:\Path\To\MyVault
```

The script should use only Node built-ins, so it needs Node 18.14 or newer (for `Headers.getSetCookie`).

**Scheduling on Windows (when it exists)**

1. Open **Task Scheduler** → **Create Basic Task**.
2. Trigger: **Daily** or **When I log on**. To repeat, edit the trigger and set **Repeat task every** to 1 hour.
3. Action: **Start a program**.
4. Program/script: the full path to `node.exe` (run `where node` to find it).
5. Add arguments: `<path to repo>\scripts\sync-vault.mjs`
6. Start in: `<path to repo>\scripts`

**Deleted notes and the 90-day window**

When a note is deleted in the app, its text is removed from the database at once. The database keeps only the
deletion record (note id and time) for 90 days, so the vault can remove the block. A vault that has not synced
for more than 90 days misses the deletions from that period, and their blocks stay in `notes.md`. Sync at least
once every 90 days.

**Starting the notes copy again from scratch**

Delete `scripts/.notes-sync.json`. The next run fetches every note. Blocks that exist are updated in place, and
missing notes are added to the bottom. A note the AI has moved out of the inbox is added again, so you may get a
duplicate. Only do this if `notes.md` has been lost.

**Notes API (used by the script)**

| Method and path | What it does |
| --------------- | ------------ |
| `GET /api/notes` | All your notes, newest first |
| `POST /api/notes` | Create a note: `{ "body": "..." }` |
| `GET /api/notes/:id` | One note |
| `PATCH /api/notes/:id` | Edit a note: `{ "body": "..." }` |
| `DELETE /api/notes/:id` | Delete a note and record the deletion |
| `GET /api/notes/sync?since=<time>` | Notes added or edited since `<time>`, and the ids deleted since then. Without `since`, every note. |

Notes have no title and no priority. Each has `createdAt` and `updatedAt`. Audio is not stored: the text is typed,
or transcribed in the browser by the microphone button.

## Notes

- On phones, a bottom bar gives quick access to To do, Done, Notes, Settings and Log out. The centre **+**
  asks whether to add a **Task** (the pop-up with text, microphone, priority and Add) or a **Note**. On
  desktop, the top menu and the inline forms are used instead.
- Notes have no title and no priority. Each one has the date it was added, and the date it was edited if
  it changed. The **Notes** page lists them. Open one to read, edit or delete it.
- Voice input: tap the microphone in the task or note field and speak. The words fill the field so you can
  edit them before saving. It uses the browser's speech recognition, so Chrome on Android works best.
  The browser sends the audio to its speech service (Google, in Chrome). The button is hidden in browsers
  without speech recognition. The audio itself is not stored, only the text.

- Sessions are signed JWTs in an httpOnly cookie that lasts one year. Changing `AUTH_SECRET` logs everyone out.
  The secret lives only in the backend project.
- Passwords are hashed with bcrypt. MCP tokens are stored only as SHA-256 hashes.
