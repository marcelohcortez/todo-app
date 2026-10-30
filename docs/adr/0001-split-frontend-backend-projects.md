# 0001. Split frontend and backend into separate Next.js projects

**Status:** Accepted

## Context

The app has two Next.js 14 projects, `frontend/` (pages, components, styles) and `backend/`
(API routes, MongoDB access, sessions, the MCP endpoint), each deploying to its own Vercel
project (see README, "Layout").

## Decision

Keep them as two independently deployable projects rather than one. The frontend's
`next.config.mjs` forwards `/api/*` to the backend, so the browser only ever talks to the
frontend's own origin.

## Consequences

- The session cookie stays first-party (set by a same-origin response as far as the browser is
  concerned), so no CORS configuration is needed for the app's own traffic — only the public
  OAuth endpoints opt into permissive CORS, and only because they carry no credentials
  (`backend/lib/oauth.ts`, `CORS_HEADERS`).
- The backend can be reused by another client (an MCP tool, a future app) without dragging the
  frontend's build along, and can be redeployed independently.
- Trade-off: two Vercel projects to configure and redeploy in the right order — the frontend reads
  `BACKEND_URL` at build time, so it must be redeployed if the backend's URL changes (README,
  "Deploy to Vercel").
