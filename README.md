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
3. Deploy. Note its URL, for example `https://todo-api.vercel.app`.

**Frontend project**

1. Root directory: `frontend`.
2. Environment variables: `BACKEND_URL` = the backend URL from above (no trailing slash).
   It is read at build time, so redeploy the frontend if the backend URL changes.
3. Deploy.

In MongoDB Atlas, allow network access from Vercel (or `0.0.0.0/0`).

Use the **frontend** URL to open the app and for MCP (below). The backend URL works for the API directly.

## Connect claude.ai (web)

1. In claude.ai, go to **Settings → Connectors → Add custom connector**.
2. URL: `https://YOUR-FRONTEND.vercel.app/api/mcp`
3. Claude opens a sign-in page on your app. Log in if asked, then click **Allow**.

Access lasts 90 days. Clicking **Revoke token** in Settings disconnects claude.ai too.

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
