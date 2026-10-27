# Tests in this app

Three layers, each with a different job:

| Layer | Runner | Where | What it's for |
| ----- | ------ | ----- | -------------- |
| Backend unit tests | [Vitest](https://vitest.dev) | `backend/lib/*.test.ts` | Pure logic and database-backed functions, against an in-memory fake DB — no real MongoDB needed. |
| Frontend component tests | Vitest + React Testing Library (jsdom) | `frontend/components/**/*.test.tsx` | How a component behaves from the user's side — what renders, what a click or keystroke does, what it fetches. |
| End-to-end tests | [Playwright](https://playwright.dev) | `frontend/e2e/*.spec.ts` | Both apps running together against a real (disposable) MongoDB, driven through an actual browser. |

Run them with:

```bash
cd backend && npm test          # unit tests
cd frontend && npm test         # component tests
cd frontend && npx playwright install chromium && E2E_MONGODB_URI="mongodb://localhost:27017" E2E_MONGODB_DB=todo_e2e npm run test:e2e
```

The e2e run **wipes every collection** in the database it's given, so it refuses to start unless the
database name contains `e2e` (see `frontend/e2e/env.ts`).

## Backend unit tests (`backend/lib/`)

Each file sits next to the module it tests, and most mock `./mongodb` with
`backend/lib/test-support/fakeDb.ts` — an in-memory stand-in collection — rather than touching a
real database.

| File | Covers |
| ---- | ------ |
| `boards.test.ts` | Board name validation, the API shape mapping, and that removing a board while moving its tasks elsewhere notifies anyone with a direct share on one of those tasks. |
| `friends.test.ts` | Sending a friend request (including auto-accept when both sides already asked, and not duplicating a pending request), accepting, and ending a friendship (including that it removes shares between the two people). |
| `http.test.ts` | `readJsonBody`: a normal chunked body parses, an oversized `Content-Length` is rejected up front, a streamed oversized body with no `Content-Length` is still rejected, and it falls back to `req.json()` when there's no body stream. |
| `mcp.test.ts` | MCP personal tokens: the generated format (32 random bytes, prefixed), that two tokens are never the same, and that hashing is a stable SHA-256 digest. |
| `mcp.sharing.test.ts` | The MCP tools stay owner-only even for an item shared with the caller — `update_task`, `set_task_completed` and `delete_task` are all refused on a merely-shared task, while the real owner can still use them. |
| `notes.test.ts` | Note body validation (including the exact 20000-character boundary) and the API shape mapping. |
| `notes.sharing.test.ts` | A friend with a share can read, edit and delete a shared note; someone with no access is refused. |
| `notifications.test.ts` | Unread counting (per user, not mixed with others), marking all read, and listing newest-first with a limit. |
| `pagination.test.ts` | Page-number parsing and the skip/page-count math, including clamping a page past the end. |
| `password.test.ts` | Every password rule in `passwordProblem`, both the accepted case and each rejection (too short, too long, no digit, no special character, a repeated digit, sequential digits). |
| `rateLimit.test.ts` | `takeAttempt` allows up to the max then refuses, and counts separate keys independently. |
| `search.test.ts` | `searchQuery`'s minimum length and trimming, and that `escapeRegex` escapes every regex special character. |
| `shares.test.ts` | Sharing rules (can't share something you don't own, can't share with a non-friend, sharing twice is a no-op), access resolution (direct share, share via the item's board, no access, non-existent item), revoking a share from either side, pagination of "shared with me", and that `notifyAccess` pings the owner plus every friend with access, without duplicates. |
| `tasks.test.ts` | Title validation (including the 500-character boundary), priority/status-filter validation, and the task → API shape mapping (no board → `null`, not completed → `null` `completedAt`). |
| `tasks.default-board.test.ts` | Creating a task without a board leaves it without one — even when the user already has a "general" board. |
| `tasks.retention.test.ts` | Completed tasks are purged after the 30-day retention window, scoped to one user or across all users, and that listing completed tasks purges old ones first. |
| `tasks.search.test.ts` | Task search also matches by board name, not just title, and stays separate from the active/done filter. |
| `tasks.sharing.test.ts` | A friend can edit a task via a direct share or via access to its board; someone with no access is refused; a friend can't move a shared task onto a board of their own; a task created on a shared board is visible to the friend regardless of who created it; a friend with board access can delete a task on it. |

## Frontend component tests (`frontend/components/`)

Rendered with React Testing Library in jsdom; network calls are mocked.

| File | Covers |
| ---- | ------ |
| `AddTaskForm.test.tsx` | The Add button is enabled and labelled "Add" normally, and while a save is in progress it is disabled and shows a spinner instead of the text (so a second tap can't add the task twice). |
| `AddUserPage.test.tsx` | Shows only a message to a non-admin (no form), shows the form and existing users to the admin, and shows nothing before the server has answered. |
| `BoardPills.test.tsx` | The board selector and per-board actions: listing boards, switching the shown board, hiding edit/delete/share for "All boards", renaming a board inline (save on Enter, revert on Escape, save on blur), and asking the parent to delete or share the selected board. |
| `FriendsPage.test.tsx` | Adding a friend by email always shows the same generic message (so it can't be used to test which emails have accounts), incoming requests show Accept/Decline and call the right endpoints, and removing a friend asks for confirmation. |
| `NewBoardForm.test.tsx` | The collapsed "+ New board" control, swapping it for Cancel plus a name field, keeping the task toggle alongside it, and creating a board on submit. |
| `NotificationsBell.test.tsx` | The unread badge count (including showing none when nothing is unread), opening the list marks everything read, and the badge is **not** cleared if the mark-read request fails (regression test — see the note below on optimistic UI). |
| `OptionsMenu.test.tsx` | The menu's items for everyone vs. only the admin (Add user), the callbacks for each item, and the two presentations (dropdown on desktop, sheet on phone) including that the dropdown closes on an outside click. |
| `SearchBar.test.tsx` | Search starts at 3 characters, debounces while typing, falls back to the full list below 3 characters, and the × button clears both the text and the search. |
| `ShareSheet.test.tsx` | Pre-checks friends the item is already shared with, adds a new share and removes a cleared one on save, and shows a message when the user has no friends yet. |
| `SharedPage.test.tsx` | Expanding a shared board loads and shows its tasks, adding a task posts it to the right board and clears the input, and editing a shared task's title saves and leaves edit mode. |
| `ui/Sheet.test.tsx` | Focus trap: focus moves into the sheet on open, Tab/Shift+Tab wrap between the first and last focusable element instead of escaping the sheet, and focus returns to the trigger on close. |

## End-to-end tests (`frontend/e2e/`)

Each spec starts from a real login and drives the actual UI in a browser, against both apps running
together and a real (but disposable) MongoDB. `global-setup.ts` seeds the admin account
(`admin@e2e.test`); `helpers.ts` holds shared steps like logging in.

| File | Covers |
| ---- | ------ |
| `auth.spec.ts` | There's no public sign-up page, a wrong password shows an error and does not log in, a signed-out visitor is redirected to login, and the logo link goes home. |
| `notes.spec.ts` | A note can be created, edited and deleted from the list; a note is private — a second user never sees the first user's note. |
| `options.phone.spec.ts` | On a phone-sized viewport, Options opens a sheet with Settings, Add user and Log out. |
| `settings.spec.ts` | Each MCP client gets its own token, and revoking one token leaves the others still working. |
| `tasks.spec.ts` | Opening "+ New board" closes the add-task form (and its Cancel takes the board form's place); a task is added and shows in the list; a task belongs to its owner and a second user never sees it. |
| `users.spec.ts` | The admin can open "Add user" and sees existing accounts there; an admin-created user can log in but cannot add users themself. |

## Notes on what these tests are (and aren't) covering

A few of the tests above double as regression tests for specific bugs that were found and fixed —
most directly relevant to security/data-isolation:

- The **"a task/note belongs to its owner"** e2e tests (`tasks.spec.ts`, `notes.spec.ts`) exist
  specifically to catch a regression where one user could see another user's private data.
- **`mcp.sharing.test.ts`** exists because the MCP tools once had no authorization check of their
  own and could be used to bypass the sharing model (a friend with read access to a task could
  reassign it to their own board over MCP, even though the HTTP API already blocked that).
- **`NotificationsBell.test.tsx`**'s "keeps the unread badge when marking notifications read fails"
  case guards against the UI reporting something as done (read) before the server confirmed it.

See `docs/SECURITY.md` for the security-specific measures these and other tests back up.
