import { NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { currentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

// GET /api/auth/me  → { email, isAdmin } for the signed-in user
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const user = await currentUser(userId);
  if (!user) return unauthorized();
  return NextResponse.json(user);
}
