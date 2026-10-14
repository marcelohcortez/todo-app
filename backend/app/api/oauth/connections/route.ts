import { NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { listConnections } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Apps (such as claude.ai) that are connected to this user's account.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  return NextResponse.json({ connections: await listConnections(userId) });
}
