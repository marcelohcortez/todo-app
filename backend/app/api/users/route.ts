import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { createUser, currentUser } from "@/lib/users";

// POST /api/users  { email, password }  (admin only)
// Creates an account for someone else. The admin stays signed in as themselves.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  if (!(await currentUser(userId))?.isAdmin) {
    return NextResponse.json({ error: "Only the admin can add users" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "Password must be 8 to 200 characters" }, { status: 400 });
  }

  try {
    await createUser(email, password);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }
  return NextResponse.json({ user: { email } }, { status: 201 });
}
