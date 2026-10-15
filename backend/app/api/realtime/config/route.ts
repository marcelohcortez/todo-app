import { NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { publicPusherConfig, userChannel } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// GET /api/realtime/config: what the browser needs to listen for changes.
// `pusher` is null when live updates are not configured on the server.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  return NextResponse.json({ channel: userChannel(userId), pusher: publicPusherConfig() });
}
