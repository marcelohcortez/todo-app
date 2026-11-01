import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/http";
import { ObjectId } from "mongodb";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { usersCollection } from "@/lib/users";
import { LEGACY_TOKEN_ID, generateMcpToken, hashToken, getMcpTokenExpiry, isTokenExpired } from "@/lib/mcp";
import type { McpTokenDoc } from "@/lib/types";

const MAX_LABEL = 40;

// Lists this user's MCP tokens. The plain tokens are never returned, only their names.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const user = await (await usersCollection()).findOne({ _id: new ObjectId(userId) });
  const tokens: { id: string; label: string; createdAt: string; expiresAt?: string }[] = (user?.mcpTokens ?? [])
    .filter((t) => !isTokenExpired(t.expiresAt || new Date(Date.now() + 86400000)))
    .map((t) => ({
      id: t.id,
      label: t.label,
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt?.toISOString(),
    }));
  // A token saved before named tokens existed has no name or date.
  if (user?.mcpTokenHash) tokens.unshift({ id: LEGACY_TOKEN_ID, label: "Earlier token", createdAt: "" });
  return NextResponse.json({ tokens });
}

// Creates a named token, for example one per AI client. Existing tokens keep working.
// The plain token is returned once and never stored.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await readJsonBody(req).catch(() => null);
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
    expiresAt: getMcpTokenExpiry(),
  };
  await (await usersCollection()).updateOne({ _id: new ObjectId(userId) }, { $push: { mcpTokens: doc } });
  return NextResponse.json({ token });
}
