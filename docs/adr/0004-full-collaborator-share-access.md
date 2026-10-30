# 0004. A share grants full collaborator access, not view-only

**Status:** Accepted

## Context

Sharing a board, task, or note with a friend (`backend/lib/shares.ts`) could have meant read-only
access or full edit/delete access. The app chose the latter: a friend with a share on a task can
edit and delete it, same as the owner, with one carved-out exception — only the owner may move a
task to a different board (`backend/app/api/tasks/[id]/route.ts`, the `boardId` branch of
`PATCH`).

## Decision

A share is full collaborator access (edit and delete), not view-only. The thing actually guarded
against is a request reaching someone with no relationship to the item at all — not a friend
seeing more than they should once they do have a share.

## Consequences

- Matches the app's actual use case: shared tasks/notes/boards are for people collaborating on the
  same list (e.g. a shared household board), not for broadcasting read-only status to an audience.
- Every access check in `shares.ts` (`resolveTaskAccess`, `resolveNoteAccess`,
  `resolveBoardViewAccess`) is binary — has access or doesn't — rather than carrying a
  read/write/owner permission level, which keeps the authorization logic simpler.
- The one deliberate exception (moving a task between boards is owner-only) is a reorganization
  action that affects the owner's own board structure, not day-to-day editing of the task itself.
- Trade-off: there is no way to share something view-only. Adding that later would mean adding a
  permission level to `ShareDoc` and auditing every access-check call site.
- Tested by `backend/lib/tasks.sharing.test.ts`, `notes.sharing.test.ts`, `shares.test.ts`,
  `mcp.sharing.test.ts` — see `docs/SECURITY.md`, "Authorization".
