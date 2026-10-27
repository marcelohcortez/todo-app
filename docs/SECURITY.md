# Security measures

What is in place, where it lives, and why. This covers both deliberate hardening and the audit
that confirmed the rest of the app already handled a given risk correctly.

## Authentication and sessions

**What:** Email/password login. Sessions are a signed JWT (`jose`, HS256) in an `httpOnly` cookie,
`secure` in production, `sameSite: "lax"`, valid for one year.
**Where:** `backend/lib/auth.ts` (`createSession`, `getCurrentUserId`), used by every API route via
`getCurrentUserId()` / `unauthorized()`.
**Why:** `httpOnly` keeps the token out of reach of any script running on the page (XSS can't steal
the session). `sameSite: "lax"` stops the cookie being sent on cross-site POSTs. The signing secret
(`AUTH_SECRET`) is validated to be at least 32 characters at startup
(`backend/lib/auth.ts:9-15`), so a weak or missing secret fails loudly instead of signing tokens
nobody can trust.

There is no public sign-up: only the admin account (`ADMIN_EMAIL`) can create other users
(`backend/app/api/users/route.ts`), which keeps account creation out of reach of the open internet.

## Passwords

**What:** Hashed with bcrypt at cost factor 12 (`backend/lib/users.ts:54`,
`backend/app/api/account/password/route.ts:47`). A password must be 9–200 characters, contain a
digit and a special character, not repeat a digit, and not contain two sequential digits
(`backend/lib/password.ts`).
**Why:** Cost 12 is a reasonable, still-fast-enough-to-not-bottleneck-login balance against offline
cracking if the database were ever exposed. The rules push back on the weakest, most-guessed
passwords without requiring a password manager.
**Tested by:** `backend/lib/password.test.ts` (every rule, both accepted and rejected cases).

## Brute-force / credential-stuffing limits

**What:** `takeAttempt(key, max, windowSeconds)` counts attempts in MongoDB (not in memory, so every
serverless instance shares the count) and expires the counter automatically via a TTL index.
**Where:** `backend/lib/rateLimit.ts`.
**Applied to:**
- Login (`backend/app/api/auth/login/route.ts`): 10 attempts per email / 15 min, 50 per IP / 15 min.
  Every attempt counts, right or wrong, so a guesser can't reset the budget by logging in correctly
  on a different account.
- Password change (`backend/app/api/account/password/route.ts`): 5 attempts per user / 15 min, so a
  stolen session alone isn't enough to brute-force the current password.
- Friend requests (`backend/app/api/friends/requests/route.ts`): capped similarly to stop using the
  "add friend by email" field to enumerate accounts.

**Why:** All three are places where an attacker supplies a secret (or a guess) and the server
reveals whether it was right. Without a limit, each is a free oracle for an offline attacker to hit
as fast as the network allows.
**Tested by:** `backend/lib/rateLimit.test.ts` (allows up to the max, then refuses; counts each key
separately).

**Not rate-limited:** `POST /api/users` (admin-only account creation). It's gated behind an
already-authenticated admin session, not reachable by an anonymous attacker, so the risk a rate
limit would address isn't present.

## Authorization (every request checks who is asking)

**What:** Every API route calls `getCurrentUserId()` first and returns 401 if there's no session.
Beyond that, every read/write of a task, board, note or share is scoped to the owner's id or, for
shared items, resolved through an explicit access check.
**Where:** `backend/lib/shares.ts` — `resolveTaskAccess`, `resolveNoteAccess`,
`resolveBoardViewAccess`, and `withOwnerFallback` (which lets a friend act on a shared item only
after this resolves their access, then performs the write under the real owner's id).
**Why:** Sharing a board/task/note is intentionally full collaborator access (edit and delete), not
view-only — a deliberate, documented product choice (see the comment above
`withOwnerFallback` in `shares.ts`), not a gap. The thing actually guarded against is a request
reaching someone with **no** relationship to the item at all, including through a surface like the
MCP tools that has no HTTP-layer check of its own (`backend/lib/tasks.ts:223-224`: only the owner
may move a task between boards, even via MCP).
**Tested by:** `backend/lib/tasks.sharing.test.ts`, `notes.sharing.test.ts`, `shares.test.ts`,
`mcp.sharing.test.ts` (the last of these specifically pins down that a friend with only a share
can't reassign a task via the MCP tools).

## MCP tokens

**What:** Personal API tokens for MCP clients are generated as 32 random bytes
(`backend/lib/mcp.ts`, `generateMcpToken`) and stored only as a SHA-256 hash — the plaintext token
is shown once and never persisted.
**Why:** If the database were ever read by someone else, no usable tokens would be sitting in it.
**Tested by:** `backend/lib/mcp.test.ts` (token format and entropy, hash stability).

## OAuth (claude.ai / MCP client sign-in)

**What:** A standard authorization-code flow with PKCE (`backend/lib/oauth.ts`): short-lived codes
(5 minutes), 90-day access tokens, and `isAllowedRedirectUri` which only accepts `https://` redirect
URIs on an explicit allowlist (`claude.ai`, `claude.com`, plus `ALLOWED_REDIRECT_HOSTS`) or
`localhost`/`127.0.0.1` over `http:` for local development.
**Why:** Restricting redirect URIs closes the classic OAuth open-redirect hole, where an attacker
registers a client pointing at their own domain and harvests codes/tokens meant for the real app.
**Where it's loose on purpose:** `CORS_HEADERS` on the OAuth discovery/token endpoints allow
`Access-Control-Allow-Origin: *` (`backend/lib/oauth.ts:11-15`) — this is fine because those
endpoints are public metadata or a code-for-token exchange that doesn't involve the session cookie
(no credentials, so no cross-site cookie exposure is possible through them).

## CSRF

**What:** No separate CSRF token. Relies on the session cookie's `sameSite: "lax"` plus the
frontend-only, same-origin design: the browser only ever talks to the frontend project, and
`frontend/next.config.mjs` proxies `/api/*` to the backend server-side, so the cookie is first-party
and never sent cross-site to begin with.
**Why not a token too:** `sameSite: "lax"` already blocks the cookie being attached to cross-site
POST/PUT/DELETE requests, which is where CSRF matters. The residual gap (`lax` still allows
top-level cross-site GET navigations) doesn't apply here because no GET route in this app changes
state.

## Security response headers

**What:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`,
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, and a minimal
`Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'` — set on every
response from both apps.
**Where:** `backend/next.config.mjs` and `frontend/next.config.mjs` (`headers()`).
**Why each one:**
- `X-Content-Type-Options: nosniff` — stops the browser guessing a response is executable content
  it isn't (MIME-sniffing attacks).
- `X-Frame-Options` + `frame-ancestors 'none'` — stops the app being embedded in another site's
  `<iframe>` for clickjacking. Both are set; `frame-ancestors` is the modern replacement and
  `X-Frame-Options` is kept for older browsers that don't read CSP.
- `Referrer-Policy` — stops the full URL (which could contain a task search query, for example)
  leaking to third-party sites a link is clicked through to.
- `Permissions-Policy` — the app uses none of camera/microphone/geolocation itself (voice input
  uses the browser's own speech-recognition API, not `getUserMedia`), so they're switched off at
  the browser level in case a future dependency tries to request them.
- `Strict-Transport-Security` — once a browser has loaded the site over HTTPS once, forces HTTPS on
  every later visit, closing the window for a downgrade/SSL-stripping attack on a shared network.
- `base-uri 'self'` / `object-src 'none'` — the narrow, safe-by-default part of CSP that can't break
  anything (no `<object>`/`<embed>` is used, and nothing injects a `<base>` tag), without touching
  `script-src`/`style-src`, which would need much more careful, page-by-page verification before
  it's safe to tighten.
**Verified:** by a production build of both apps and a running server (`next start`), confirming the
headers appear on real responses and the login page's scripts (all same-origin `/_next/static/...`
chunks) still load.

## Input handling: injection and XSS

**XSS:** No `dangerouslySetInnerHTML`, `innerHTML` or `insertAdjacentHTML` anywhere in the codebase.
Every piece of user text (task titles, note bodies, board names, emails) is rendered through normal
JSX, so React's default escaping applies everywhere. No dedicated sanitization library was added,
because there's no raw-HTML sink for it to protect.

**NoSQL/regex injection:** Every MongoDB `$regex` filter built from user input goes through
`escapeRegex()` (`backend/lib/search.ts:12-14`) before being used, in `boards.ts`, `notes.ts`,
`tasks.ts`, `search.ts` — so characters with special meaning in a regex (`.`, `*`, `+`, etc.) are
escaped and a search for `a+b` can't be turned into an unintended pattern. User-vs-friend lookups by
email use an exact-match `findOne({ email })`, not a regex, so there's no ReDoS surface there.
**Tested by:** `backend/lib/search.test.ts` (`escapeRegex` on every special character),
`backend/lib/tasks.search.test.ts` (search matching via the escaped filter).

**Field length limits:** every free-text field is capped before it reaches the database — task
title 500 chars (`backend/lib/tasks.ts`), note body 20000 chars (`backend/lib/notes.ts`), board name
40 chars (`backend/lib/boards.ts`), search query 200 chars (`backend/lib/search.ts`). This bounds
both storage growth and the size of any single field an attacker could try to abuse.

## Oversized request bodies

**What:** `readJsonBody(req)` (`backend/lib/http.ts`) replaces `req.json()` in every API route. It
rejects a body outright if `Content-Length` exceeds 256KB, and also counts bytes as the body streams
in and aborts the read once the same limit is crossed — because `Content-Length` can be missing or
spoofed.
**Why:** Before this, a route handler would call `req.json()` directly, which buffers and parses the
*entire* body before any of the app's own field-length checks (above) ever run. A request with a
multi-gigabyte body would be fully read into memory first and only rejected afterwards — a cheap
denial-of-service lever against the server's memory and CPU. 256KB is comfortably above the largest
legitimate payload (a 20000-character note body is at most ~80KB of UTF-8).
**Tested by:** `backend/lib/http.test.ts` — parses a normal chunked body, rejects on an
oversized `Content-Length` header, rejects a streamed body with no `Content-Length` header at all
once it crosses the limit, and falls back to `req.json()` when there's no body stream to read.
**Verified live:** by starting a production build and sending both a normal and an oversized request
to a real route.

## Database network access

**What:** Documented requirement (`README.md`) to restrict MongoDB Atlas network access to only the
addresses that need it, and never open it to `0.0.0.0/0`.
**Why:** The database holds password hashes and every user's private tasks/notes; it should never be
reachable by an arbitrary IP on the internet regardless of how strong the application-layer auth is.

## Secrets

**What:** No `.env`/`.env.local` file is committed; only `.env.example` templates exist
(`backend/.env.example`, `frontend/.env.example`), and `.gitignore` excludes `.env*`.
**Why:** Keeps `AUTH_SECRET`, `MONGODB_URI`, `CRON_SECRET` and the Pusher credentials out of the
repository (and out of GitHub's history) entirely.

## What was looked at and found already correct

An audit before adding the items above also checked, and found no issue with:
- Whether any route built a MongoDB query directly from unescaped user input (it doesn't — see
  "Input handling" above).
- Whether a sanitization library was needed for rendering (it isn't — no raw-HTML sink exists).
- Whether signup/password-change rate limiting existed (it did, already).
- Whether CORS was too permissive on the main API (it isn't exposed to CORS at all; only the public
  OAuth endpoints are, and those don't carry credentials).
