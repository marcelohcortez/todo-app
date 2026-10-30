# Database schema

MongoDB, no fixed schema enforced by the database itself — the shapes below are the TypeScript
interfaces in `backend/lib/types.ts` (and the per-feature `lib/*.ts` files for collections not
defined there) that the app writes and reads. Collection names are passed to `db.collection<T>(name)`
at each call site.

## `users`

```ts
{ _id, email, passwordHash, mcpTokens?: McpTokenDoc[], mcpTokenHash?: string, createdAt }
```

- `mcpTokens[]` — named personal API tokens: `{ id, label, hash, createdAt }`. Only the SHA-256
  hash is stored; the plaintext token is shown once at creation.
- `mcpTokenHash` — a single legacy token from before named tokens existed, still accepted.
- No `isAdmin` field in the schema; admin status is derived by comparing `email` to `ADMIN_EMAIL`
  (see `backend/lib/users.ts`).
- Indexes: `{ email: 1 }` unique, `{ "mcpTokens.hash": 1 }` sparse.

## `tasks`

```ts
{ _id, userId, title, priority: "high"|"medium"|"normal", boardId?: ObjectId|null, completed, createdAt, completedAt, updatedAt }
```

- `boardId` is absent/`null` for tasks created before boards existed, or explicitly unassigned.
- Owned by `userId` — including tasks created by a friend on a board shared with them (ownership
  always follows the board/task owner, not the creator).
- Completed tasks are purged after a retention window (`backend/lib/tasks.ts`,
  `purgeExpiredDoneTasks`, run daily by `GET /api/cron/purge-done`).
- Indexes: none in the base schema file; see the Database Indexing work tracked in issue #19.

## `boards`

```ts
{ _id, userId, name, createdAt }
```

- Groups tasks for one user. Task counts (`active`/`done`/`total`) are computed on read, not stored.
- Indexes: none currently (see issue #19).

## `notes`

```ts
{ _id, userId, body, createdAt, updatedAt }
```

- No title, no priority — just free text (max 20000 chars), optionally voice-transcribed client-side.
- Indexes: none currently (see issue #19).

## `note_deletions`

```ts
{ _id, userId, noteId, deletedAt }
```

- Written when a note is deleted; holds no note content. Kept for 90 days so the (future) vault
  sync script can detect and remove the corresponding block in the vault — see README,
  "Sync tasks and notes to your vault".

## `friendships`

```ts
{ _id, requesterId, recipientId, status: "pending"|"accepted", createdAt, respondedAt }
```

- At most one document between any two users, checked in both directions before insert
  (`backend/lib/friends.ts`).
- Indexes: `{ requesterId: 1, recipientId: 1 }`, `{ recipientId: 1, requesterId: 1 }`.

## `shares`

```ts
{ _id, ownerId, friendId, kind: "board"|"task"|"note", itemId, createdAt }
```

- A board share covers all of that board's present and future tasks; a task/note share covers just
  that one item. Access is full collaborator (edit/delete), not view-only — a deliberate choice, see
  `docs/adr/0004-full-collaborator-share-access.md`.
- Indexes: `{ friendId: 1, kind: 1, itemId: 1 }`, `{ ownerId: 1, kind: 1, itemId: 1 }`.

## `notifications`

```ts
{ _id, userId, type: "friend_request"|"friend_accepted"|"share", data: { fromUserId?, fromEmail?, kind?, itemId? }, createdAt, readAt }
```

- Never created on its own — always written alongside the realtime ping (`notifyChanged`) for
  whatever triggered it.
- Indexes: `{ userId: 1, readAt: 1, createdAt: -1 }`.

## `rateLimits`

```ts
{ _id: "<key>:<windowStart>", count, expiresAt }
```

- Backs `takeAttempt()` (`backend/lib/rateLimit.ts`). Counted in MongoDB rather than in memory so
  every serverless instance shares the same count — see
  `docs/adr/0003-mongo-backed-rate-limiting.md`.
- Indexes: `{ expiresAt: 1 }` with `expireAfterSeconds: 0` — Mongo deletes the counter itself once
  its window ends.

## `oauthClients`

```ts
{ clientId, clientName, redirectUris: string[], createdAt }
```

- Created via RFC 7591 dynamic client registration (`POST /api/oauth/register`).
- Indexes: `{ clientId: 1 }` unique.

## `oauthCodes`

```ts
{ codeHash, clientId, userId, redirectUri, codeChallenge, expiresAt }
```

- Short-lived (5 minutes) authorization codes for the PKCE flow. Stored hashed; consumed (deleted)
  on exchange before validation, so a code can't be replayed even on a failed check.
- Indexes: `{ codeHash: 1 }` unique, `{ expiresAt: 1 }` with `expireAfterSeconds: 0`.

## `oauthTokens`

```ts
{ tokenHash, clientId, userId, createdAt?, expiresAt }
```

- Access tokens, 90-day TTL. `createdAt` is missing on tokens issued before the field was added.
- Indexes: `{ tokenHash: 1 }` unique, `{ expiresAt: 1 }` with `expireAfterSeconds: 0`.

## Relations

```
users ──┬── tasks (userId)
        ├── boards (userId) ──── tasks (boardId)
        ├── notes (userId)
        ├── friendships (requesterId / recipientId)
        ├── shares (ownerId / friendId) ──→ tasks | boards | notes (itemId, polymorphic on `kind`)
        ├── notifications (userId)
        ├── oauthTokens / oauthCodes (userId)
        └── mcpTokens (embedded array, not a separate collection)

note_deletions ── notes (noteId is a string copy, not a live reference — the note is already gone)
oauthClients ── oauthCodes / oauthTokens (clientId, a string, not an ObjectId reference)
```

There are no foreign-key constraints — MongoDB doesn't enforce them, and the app relies on its own
access-resolution functions (`backend/lib/shares.ts`: `resolveTaskAccess`, `resolveNoteAccess`,
`resolveBoardViewAccess`) rather than joins to check what a user may read or write.
