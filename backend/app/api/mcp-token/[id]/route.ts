import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { LEGACY_TOKEN_ID } from "@/lib/mcp";
import { usersCollection } from "@/lib/users";

// DELETE /api/mcp-token/:id: revokes one token. Other tokens and connected apps are not affected.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const users = await usersCollection();
  const uid = new ObjectId(userId);
  if (params.id === LEGACY_TOKEN_ID) {
    const res = await users.updateOne({ _id: uid, mcpTokenHash: { $exists: true } }, { $unset: { mcpTokenHash: "" } });
    if (res.modifiedCount !== 1) return NextResponse.json({ error: "Token not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const res = await users.updateOne({ _id: uid }, { $pull: { mcpTokens: { id: params.id } } });
  if (res.modifiedCount !== 1) return NextResponse.json({ error: "Token not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
