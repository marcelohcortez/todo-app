import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { revokeConnection } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Disconnects one app. Its access stops working immediately.
export async function DELETE(_req: NextRequest, { params }: { params: { clientId: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const ok = await revokeConnection(userId, params.clientId);
  if (!ok) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
