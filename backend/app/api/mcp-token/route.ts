import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { usersCollection } from "@/lib/users";
import { generateMcpToken, hashToken } from "@/lib/mcp";

// Whether this user currently has an MCP token.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const user = await (await usersCollection()).findOne({ _id: new ObjectId(userId) });
  return NextResponse.json({ hasToken: Boolean(user?.mcpTokenHash) });
}

// Creates (or replaces) the MCP token. The plain token is returned once and never stored.
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const token = generateMcpToken();
  await (await usersCollection()).updateOne(
    { _id: new ObjectId(userId) },
    { $set: { mcpTokenHash: hashToken(token) } }
  );
  return NextResponse.json({ token });
}

// Revokes the MCP token.
export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await (await usersCollection()).updateOne(
    { _id: new ObjectId(userId) },
    { $unset: { mcpTokenHash: "" } }
  );
  return NextResponse.json({ ok: true });
}
