import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { authorizeUserChannel } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// POST /api/pusher/auth: Pusher's client calls this to join a private channel.
// Only the signed-in user's own channel is allowed.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const form = await req.formData().catch(() => null);
  const socketId = form?.get("socket_id");
  const channel = form?.get("channel_name");
  if (typeof socketId !== "string" || typeof channel !== "string") {
    return NextResponse.json({ error: "socket_id and channel_name are required" }, { status: 400 });
  }

  const auth = authorizeUserChannel(userId, socketId, channel);
  if (!auth) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json(auth);
}
