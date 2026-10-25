import { NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { listRecentNotifications, unreadCount } from "@/lib/notifications";

// GET /api/notifications  { notifications, unreadCount }
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const [notifications, count] = await Promise.all([listRecentNotifications(userId), unreadCount(userId)]);
  return NextResponse.json({ notifications, unreadCount: count });
}
