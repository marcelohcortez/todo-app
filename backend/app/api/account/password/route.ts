import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { takeAttempt, tooManyAttempts } from "@/lib/rateLimit";
import { usersCollection } from "@/lib/users";

// Up to 5 password checks per user in each 15-minute window. This stops guessing the current password.
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

// POST /api/account/password  { currentPassword, newPassword }
// Changes the signed-in user's password. The current password must be given, so a stolen session alone is not enough.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Enter your current password and a new one" }, { status: 400 });
  }

  // Counted before the password is checked, so every try uses up the budget, right or wrong.
  const attempt = await takeAttempt(`password:${userId}`, MAX_ATTEMPTS, WINDOW_SECONDS);
  if (!attempt.allowed) return tooManyAttempts(attempt.retryAfterSeconds);

  const users = await usersCollection();
  const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { passwordHash: 1 } });
  if (!user) return unauthorized();

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Your current password is not correct" }, { status: 400 });
  }

  const problem = passwordProblem(newPassword);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "The new password must be different from the current one" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await users.updateOne({ _id: user._id }, { $set: { passwordHash } });
  return NextResponse.json({ ok: true });
}
