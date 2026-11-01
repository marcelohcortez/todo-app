import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "session";
// One year. The cookie is re-issued on each login; after a year you log in again.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
// Current key identifier (rotate by changing this value; old tokens with the previous key still verify).
const CURRENT_KEY_ID = process.env.AUTH_SECRET_KEY_ID ?? "v1";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

/** Keys that are allowed to verify tokens. Always includes the current key; optionally the previous key during rotation. */
function allowedSecrets(): Array<{ id: string; key: Uint8Array }> {
  const current = { id: CURRENT_KEY_ID, key: secretKey() };
  // If AUTH_SECRET_PREV is set, it represents a rotated-out secret that still needs to verify existing tokens.
  const prevSecret = process.env.AUTH_SECRET_PREV;
  if (!prevSecret || prevSecret.length < 32) {
    return [current];
  }
  return [current, { id: "prev", key: new TextEncoder().encode(prevSecret) }];
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", kid: CURRENT_KEY_ID })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS)
    .sign(secretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    // Try all allowed secrets (current + any rotated-out previous key).
    for (const { key } of allowedSecrets()) {
      try {
        const { payload } = await jwtVerify(token, key);
        return typeof payload.sub === "string" ? payload.sub : null;
      } catch {
        // Wrong key for this token, try the next one.
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}
