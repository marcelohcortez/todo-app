import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { usersCollection } from "@/lib/users";
import { LEGACY_TOKEN_ID, generateMcpToken, hashToken } from "@/lib/mcp";
import type { McpTokenDoc } from "@/lib/types";

const MAX_LABEL = 40;

// Lists this user's MCP tokens. The plain tokens are never returned, only their names.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const user = await (await usersCollection()).findOne({ _id: new ObjectId(userId) });
  const tokens: { id: string; label: string; createdAt: string | null }[] = (user?.mcpTokens ?? []).map((t) => ({
    id: t.id,
    label: t.label,
    createdAt: t.createdAt.toISOString(),
  }));
  // A token saved before named tokens existed has no name or date.
  if (user?.mcpTokenHash) tokens.unshift({ id: LEGACY_TOKEN_ID, label: "Earlier token", createdAt: null });
  return NextResponse.json({ tokens });
}

// Creates a named token, for example one per AI client. Existing tokens keep working.
// The plain token is returned once and never stored.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const trimmed = typeof body?.label === "string" ? body.label.trim() : "";
  if (trimmed.length > MAX_LABEL) {
    return NextResponse.json({ error: `Name must be ${MAX_LABEL} characters or fewer` }, { status: 400 });
  }
  const label = trimmed || "Token";

  const token = generateMcpToken();
  const doc: McpTokenDoc = {
    id: randomBytes(8).toString("hex"),
    label,
    hash: hashToken(token),
    createdAt: new Date(),
  };
  await (await usersCollection()).updateOne({ _id: new ObjectId(userId) }, { $push: { mcpTokens: doc } });
  return NextResponse.json({ token });
}
