import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { unshareItem } from "@/lib/shares";

// DELETE /api/shares/:id
// Removes a share. Either the owner or the friend it was shared with may call this.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const ok = await unshareItem(userId, params.id);
  if (!ok) return NextResponse.json({ error: "Share not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
