# API reference

Every route below lives in `backend/app/api/`. Unless noted, a route requires a signed-in session
(the `session` cookie set by `POST /api/auth/login`) and returns `401 { "error": "..." }` without
one. Error responses are always `{ "error": "message" }` with an appropriate status code.

## Auth

| Method & path | Auth | Body | Response |
| --- | --- | --- | --- |
| `POST /api/auth/login` | none | `{ email, password }` | `{ ok: true }`, sets the session cookie. Rate-limited: 10 attempts/email and 50/IP per 15 min. |
| `POST /api/auth/logout` | session | — | `{ ok: true }`, clears the session cookie. |
| `GET /api/auth/me` | session | — | `{ email, isAdmin }` for the signed-in user. |
| `GET /api/auth/session` | session | — | `{ ok: true }`. Used by the OAuth consent page to check sign-in before showing Allow/Deny. |

## Account

| Method & path | Auth | Body | Response |
| --- | --- | --- | --- |
| `POST /api/account/password` | session | `{ currentPassword, newPassword }` | `{ ok: true }`. Current password must match; new password must satisfy `passwordProblem` rules and differ from the current one. Rate-limited: 5 attempts/user per 15 min. |

## Users (admin only)

| Method & path | Auth | Body | Response |
| --- | --- | --- | --- |
| `GET /api/users` | session + admin | — | `{ users }` — every account's email and creation date. |
| `POST /api/users` | session + admin | `{ email, password }` | `{ user: { email } }`, `201`. Creates another account; there is no public sign-up. Email must be valid, password 8–200 chars. `409` on a duplicate email. |

## Tasks

| Method & path | Auth | Query / Body | Response |
| --- | --- | --- | --- |
| `GET /api/tasks` | session | `?status=active\|done\|all&page=1&boardId=<id>\|none&q=<text>` | One page (20) of tasks, with total count and page count. `q` under 3 chars is ignored. |
| `POST /api/tasks` | session | `{ title, priority?, boardId? }` | `{ task }`, `201`. Title required (max 500 chars). `priority` defaults to `"normal"`. A friend with access to a shared board may add tasks to it; the task is owned by the board's owner. |
| `PATCH /api/tasks/:id` | session | `{ title?, priority?, boardId?, completed? }` | `{ task }`. Only the task's owner can move it to another board (`403` otherwise), even if a friend can edit the rest of it via a share. |
| `DELETE /api/tasks/:id` | session | — | `{ ok: true }`. |

## Boards

| Method & path | Auth | Body | Response |
| --- | --- | --- | --- |
| `GET /api/boards` | session | — | `{ boards }` — each with its task counts. |
| `POST /api/boards` | session | `{ name }` | `{ board }`, `201`. Name required, max 40 chars. |
| `PATCH /api/boards/:id` | session | `{ name }` | `{ board }`. `404` if not found, `409` on a duplicate name. |
| `DELETE /api/boards/:id` | session | `{ action: "delete" }` or `{ action: "move", targetId }` | `{ ok: true }`. `"move"` relocates the board's tasks to `targetId` first; `targetId` must be a different board the caller owns. |

## Notes

| Method & path | Auth | Query / Body | Response |
| --- | --- | --- | --- |
| `GET /api/notes` | session | `?page=1&q=<text>` | One page (20) of notes, newest first. `q` under 3 chars is ignored. |
| `POST /api/notes` | session | `{ body }` | `{ note }`, `201`. Body required, max 20000 chars. |
| `GET /api/notes/:id` | session | — | `{ note }`. |
| `PATCH /api/notes/:id` | session | `{ body }` | `{ note }`. Same body limit as create. |
| `DELETE /api/notes/:id` | session | — | `{ ok: true }`. Also writes a 90-day deletion record so the vault sync script can remove it there. |
| `GET /api/notes/sync` | session | `?since=<ISO time>` | `{ notes, deleted, serverTime }`. Without `since`, every note and no deletions. Used by the (not yet implemented) vault sync script — see README. |

## Friends

| Method & path | Auth | Body | Response |
| --- | --- | --- | --- |
| `GET /api/friends` | session | — | `{ friends, incoming, outgoing }`. |
| `POST /api/friends/requests` | session | `{ email }` | `{ ok: true, message }` — always the same generic message, whether or not the email has an account, so this field can't be used to enumerate accounts. Rate-limited: 15/user per 15 min. |
| `PATCH /api/friends/:friendshipId` | session | `{ action: "accept" }` | `{ ok: true }`. `404` if the request doesn't exist. |
| `DELETE /api/friends/:friendshipId` | session | — | `{ ok: true }`. Declines/cancels a pending request or ends an accepted friendship; either side may call this. |

## Sharing

| Method & path | Auth | Query / Body | Response |
| --- | --- | --- | --- |
| `GET /api/shares` | session | `?kind=board\|task\|note&itemId=<id>` | `{ shares }` — who the caller has shared this item with (empty if they don't own it). |
| `POST /api/shares` | session | `{ kind, itemId, friendId }` | `{ ok: true }`, `201`. `404` if the item isn't found, `403` if `friendId` isn't a friend. |
| `DELETE /api/shares/:id` | session | — | `{ ok: true }`. Either the owner or the friend may remove it. |
| `GET /api/shared/by-me` | session | `?page=1` | Everything the caller has shared out, with who each item was shared with. |
| `GET /api/shared/with-me/boards` | session | `?page=1` | Boards shared with the caller. |
| `GET /api/shared/with-me/boards/:boardId/tasks` | session | `?status=active\|done\|all&page=1` | One page of a shared (or owned) board's tasks. `404` if the board isn't accessible. |
| `GET /api/shared/with-me/notes` | session | `?page=1` | Notes shared directly with the caller. |
| `GET /api/shared/with-me/tasks` | session | `?page=1` | Tasks shared directly with the caller (not via a shared board). |

## Notifications

| Method & path | Auth | Response |
| --- | --- | --- |
| `GET /api/notifications` | session | `{ notifications, unreadCount }`. |
| `POST /api/notifications/read` | session | `{ ok: true }`. Marks every notification read. |

## MCP tokens (Settings page)

| Method & path | Auth | Body | Response |
| --- | --- | --- | --- |
| `GET /api/mcp-token` | session | — | `{ tokens }` — id, label, creation date for each; plaintext tokens are never returned. |
| `POST /api/mcp-token` | session | `{ label? }` | `{ token }` — the plaintext token, shown once. Label max 40 chars. |
| `DELETE /api/mcp-token/:id` | session | — | `{ ok: true }`. Revokes one token without affecting others. |

## MCP endpoint

| Method & path | Auth | Notes |
| --- | --- | --- |
| `POST /api/mcp` | `Authorization: Bearer <personal token or OAuth access token>` | Streamable HTTP transport, JSON responses. `401` with a `WWW-Authenticate` header pointing at OAuth discovery if the token is missing/invalid. Tools: `list_boards`, `list_tasks`, `create_task`, `update_task`, `set_task_completed`, `delete_task` — see README for their shapes. |
| `GET /api/mcp` | — | Always `405` (`Allow: POST`). |

## OAuth (claude.ai / third-party MCP client sign-in)

Implements RFC 7591 dynamic client registration plus an OAuth 2.1 authorization-code flow with
mandatory PKCE (S256). All responses from these endpoints carry permissive CORS headers
(`Access-Control-Allow-Origin: *`) since none of them rely on the session cookie.

| Method & path | Auth | Body / Query | Response |
| --- | --- | --- | --- |
| `POST /api/oauth/register` | none | `{ redirect_uris[], client_name? }` | `201` with `client_id`, `client_name`, `redirect_uris`, etc. `redirect_uris` must all be HTTPS (or localhost for dev). |
| `GET /api/oauth/client` | none | `?client_id=&redirect_uri=` | `{ client_name }` for a registered client, used by the consent page. `400 unknown_client` otherwise. |
| `POST /api/oauth/approve` | session | `{ client_id, redirect_uri, decision, response_type, code_challenge, code_challenge_method, state?, resource? }` | `{ redirect: "<url>" }` — the redirect URI with `?code=` (or `?error=`) appended. Requires PKCE S256. |
| `POST /api/oauth/token` | none | form or JSON: `{ grant_type: "authorization_code", code, code_verifier, client_id, redirect_uri }` | `{ access_token, token_type, expires_in }`. The code is consumed (deleted) before validation, so it can't be replayed even on a failed check. |
| `GET /api/oauth/connections` | session | — | `{ connections }` — apps connected to this account. |
| `DELETE /api/oauth/connections/:clientId` | session | — | `{ ok: true }`. Disconnects one app immediately. `404` if not found. |

## Realtime (Pusher)

| Method & path | Auth | Notes |
| --- | --- | --- |
| `GET /api/realtime/config` | session | `{ channel, pusher }`. `pusher` is `null` when live updates aren't configured server-side. |
| `POST /api/pusher/auth` | session | Form body: `socket_id`, `channel_name`. Only the signed-in user's own private channel may be authorized; `403` otherwise. |

## Cron

| Method & path | Auth | Notes |
| --- | --- | --- |
| `GET /api/cron/purge-done` | `Authorization: Bearer <CRON_SECRET>` | Called daily by Vercel Cron. Deletes completed tasks past the retention window, across every user. `401` without the correct bearer secret. |

## Pagination

Every paginated list endpoint takes `?page=1` (1-indexed, defaults to 1, clamped to the last page
if the requested page is past the end) and returns 20 items per page — see `backend/lib/pagination.ts`.

## Validation helpers

Shared field-cleaning/validation lives in `backend/lib/`: `tasks.ts` (`cleanTitle`, 500 chars),
`notes.ts` (`cleanBody`, 20000 chars), `boards.ts` (`cleanBoardName`, 40 chars), `search.ts`
(`searchQuery`, 200 chars, ignored under 3), `password.ts` (`passwordProblem`). Request bodies are
read with `readJsonBody` (`backend/lib/http.ts`), which rejects a body over 256KB before it is
fully parsed.
