import { NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

// POST /api/notifications/read  Marks every notification as read.
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await markAllRead(userId);
  return NextResponse.json({ ok: true });
}
