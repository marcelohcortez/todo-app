import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/http";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { requestFriend } from "@/lib/friends";
import { takeAttempt, tooManyAttempts } from "@/lib/rateLimit";
import { currentUser } from "@/lib/users";

const MAX_ATTEMPTS = 15;
const WINDOW_SECONDS = 15 * 60;

const GENERIC_MESSAGE = "If that email has an account, they'll receive a friend request.";

// POST /api/friends/requests  { email }
// Always replies with the same message, whether or not the email has an account, so this field
// cannot be used to find out which emails are registered. Every attempt counts toward the rate
// limit, successful or not, for the same reason.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await readJsonBody(req).catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const attempt = await takeAttempt(`friend-request:${userId}`, MAX_ATTEMPTS, WINDOW_SECONDS);
  if (!attempt.allowed) return tooManyAttempts(attempt.retryAfterSeconds);

  const me = await currentUser(userId);
  if (me && me.email === email) {
    return NextResponse.json({ error: "That's your own email" }, { status: 400 });
  }

  await requestFriend(userId, email);
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
