import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { clientIp, takeAttempt, tooManyAttempts } from "@/lib/rateLimit";
import { usersCollection } from "@/lib/users";

// Each window is 15 minutes. Per email, a wrong-password guesser is stopped after 10 tries.
// Per address, one machine is stopped after 50 tries, which covers guessing many accounts.
const WINDOW_SECONDS = 15 * 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Every attempt counts, successful or not, so a guesser cannot reset the count by logging in.
  const [byEmail, byIp] = await Promise.all([
    takeAttempt(`login:email:${email}`, 10, WINDOW_SECONDS),
    takeAttempt(`login:ip:${clientIp(req)}`, 50, WINDOW_SECONDS),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    return tooManyAttempts(Math.max(byEmail.retryAfterSeconds, byIp.retryAfterSeconds));
  }

  const user = await (await usersCollection()).findOne({ email });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user._id.toHexString());
  return NextResponse.json({ ok: true });
}
