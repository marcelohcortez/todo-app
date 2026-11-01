import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/http";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { createUser, currentUser, listUsers } from "@/lib/users";
import { z } from "zod";

// Schema for admin-created user accounts.
const CreateUserSchema = z.object({
  email: z.string().email("Enter a valid email").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(12, "Password must be at least 12 characters").max(200),
});

// GET /api/users  (admin only): every account with its email and when it was added.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  if (!(await currentUser(userId))?.isAdmin) {
    return NextResponse.json({ error: "Only the admin can see users" }, { status: 403 });
  }
  return NextResponse.json({ users: await listUsers() });
}

// POST /api/users  { email, password }  (admin only)
// Creates an account for someone else. The admin stays signed in as themselves.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  if (!(await currentUser(userId))?.isAdmin) {
    return NextResponse.json({ error: "Only the admin can add users" }, { status: 403 });
  }

  const raw = await readJsonBody(req).catch(() => null);
  const result = CreateUserSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { email, password } = result.data;

  try {
    await createUser(email, password);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    console.error("createUser failed:", err);
    throw err;
  }
  return NextResponse.json({ user: { email } }, { status: 201 });
}
