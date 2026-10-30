# 0003. Count rate-limit attempts in MongoDB, not in memory

**Status:** Accepted

## Context

`takeAttempt()` (`backend/lib/rateLimit.ts`) needs to refuse an attacker after N attempts in a
time window, for login, password changes, and friend requests. The backend runs as Vercel
serverless functions: there is no single long-lived process holding an in-memory counter that
every request would hit.

## Decision

Store attempt counters as documents in a `rateLimits` collection in MongoDB, keyed by
`<key>:<windowStart>`, with a TTL index (`expiresAt`, `expireAfterSeconds: 0`) so Mongo deletes
each counter automatically once its window ends — no cleanup job needed.

## Consequences

- Every serverless instance shares the same count, so a limit is actually enforced regardless of
  which instance handles which request — an in-memory counter per instance would let an attacker
  get a fresh budget just by landing on a different instance.
- Adds one or two extra MongoDB round-trips per rate-limited request (an upsert via
  `findOneAndUpdate`), traded for correctness under a serverless, multi-instance deployment.
- Window boundaries are fixed (`Math.floor(now / windowMs) * windowMs`), not a rolling window —
  simpler to implement correctly than a sliding window, at the cost of allowing a burst of up to
  2x the limit right at a window boundary.
