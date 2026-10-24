import { NextRequest, NextResponse } from "next/server";
import { getDb } from "./mongodb";

// Attempts are counted in MongoDB, not in memory, so every serverless instance shares the same count.
interface CounterDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

let indexReady = false;

async function counters() {
  const col = (await getDb()).collection<CounterDoc>("rateLimits");
  if (!indexReady) {
    // Mongo deletes a counter once its window has ended.
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    indexReady = true;
  }
  return col;
}

export interface AttemptResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Counts one attempt under `key`, in a window of `windowSeconds` that starts on a fixed boundary.
 * The attempt is allowed while the count in this window is at most `max`.
 */
export async function takeAttempt(key: string, max: number, windowSeconds: number): Promise<AttemptResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = new Date(windowStart + windowMs);

  const doc = await (await counters()).findOneAndUpdate(
    { _id: `${key}:${windowStart}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: windowEnd } },
    { upsert: true, returnDocument: "after" }
  );

  return {
    allowed: (doc?.count ?? 1) <= max,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd.getTime() - now) / 1000)),
  };
}

/** The address the request came from. Vercel sets x-real-ip; x-forwarded-for is the fallback. */
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** The 429 response, with a Retry-After header and a message the user can read. */
export function tooManyAttempts(retryAfterSeconds: number): NextResponse {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return NextResponse.json(
    { error: `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
