import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { cleanBoardName, createBoard, listBoards } from "@/lib/boards";

// GET /api/boards
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  return NextResponse.json({ boards: await listBoards(userId) });
}

// POST /api/boards  { name }
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const name = cleanBoardName(body?.name);
  if (!name) {
    return NextResponse.json({ error: "Board name is required (max 40 characters)" }, { status: 400 });
  }

  const board = await createBoard(userId, name);
  return NextResponse.json({ board }, { status: 201 });
}
