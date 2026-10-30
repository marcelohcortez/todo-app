# 0002. No public sign-up; the admin creates accounts

**Status:** Accepted

## Context

`POST /api/users` creates a new account, but it is gated behind an already-authenticated admin
session (`currentUser(userId)?.isAdmin`), not reachable by an anonymous visitor. There is no
`/signup` route or page. The admin is whoever's email matches `ADMIN_EMAIL`.

## Decision

Keep account creation admin-only. The first account (the admin's own) is created out-of-band —
README says to insert it directly with a script that writes a bcrypt password hash — and the
admin adds everyone else from **Options → Add user**.

## Consequences

- Removes an entire class of attack surface that a public sign-up form would otherwise need
  defending: no email-enumeration risk on a signup endpoint, no bot account creation, no need to
  rate-limit or CAPTCHA a public registration flow (see `docs/SECURITY.md`, "Not rate-limited").
- Fits the app's actual shape: a small, invite-only group of users (friends/family sharing tasks
  and notes), not an open product.
- Trade-off: onboarding a new person requires the admin to act; this app does not support
  self-service sign-up even if someone wanted one.
