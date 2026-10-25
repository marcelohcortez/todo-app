import { NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { listFriendState } from "@/lib/friends";

// GET /api/friends  { friends, incoming, outgoing }
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  return NextResponse.json(await listFriendState(userId));
}
