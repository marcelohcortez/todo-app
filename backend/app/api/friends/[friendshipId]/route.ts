import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { acceptFriendRequest, removeFriendship } from "@/lib/friends";

// PATCH /api/friends/:friendshipId  { action: "accept" }
export async function PATCH(req: NextRequest, { params }: { params: { friendshipId: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (body?.action !== "accept") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const result = await acceptFriendRequest(userId, params.friendshipId);
  if (result === "not_found") {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/friends/:friendshipId
// Declines or cancels a pending request, or ends an accepted friendship. Either person involved may call this.
export async function DELETE(_req: NextRequest, { params }: { params: { friendshipId: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const result = await removeFriendship(userId, params.friendshipId);
  if (result === "not_found") {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
