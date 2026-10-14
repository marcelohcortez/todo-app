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

In MongoDB Atlas, allow network access from Vercel (or `0.0.0.0/0`).

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

## Notes

- Sessions are signed JWTs in an httpOnly cookie that lasts one year. Changing `AUTH_SECRET` logs everyone out.
  The secret lives only in the backend project.
- Passwords are hashed with bcrypt. MCP tokens are stored only as SHA-256 hashes.
