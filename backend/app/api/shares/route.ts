import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { shareItem, sharesForItem } from "@/lib/shares";

const KINDS = ["board", "task", "note"] as const;

// GET /api/shares?kind=&itemId=  Who the caller has shared this item with (empty if they don't own it).
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const params = req.nextUrl.searchParams;
  const kind = params.get("kind");
  const itemId = params.get("itemId");
  if (!KINDS.includes(kind as (typeof KINDS)[number]) || !itemId) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const shares = await sharesForItem(userId, kind as (typeof KINDS)[number], itemId);
  return NextResponse.json({ shares });
}

// POST /api/shares  { kind, itemId, friendId }
// Shares a board, task, or note the caller owns with a friend.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const itemId = body?.itemId;
  const friendId = body?.friendId;
  if (!KINDS.includes(kind) || typeof itemId !== "string" || typeof friendId !== "string") {
    return NextResponse.json({ error: "Invalid share request" }, { status: 400 });
  }

  const result = await shareItem(userId, friendId, kind, itemId);
  if (result === "not_found") {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (result === "not_friends") {
    return NextResponse.json({ error: "You can only share with a friend" }, { status: 403 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
