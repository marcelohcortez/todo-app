import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { cleanBoardName, createBoard, listBoardSummaries } from "@/lib/boards";

// GET /api/boards  (each board with its task counts)
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  return NextResponse.json({ boards: await listBoardSummaries(userId) });
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
  // Looked up again so the counts are right even when an existing board with this name was returned.
  const summary = (await listBoardSummaries(userId)).find((b) => b.id === board.id);
  return NextResponse.json({ board: summary ?? { ...board, taskCount: 0, activeCount: 0, doneCount: 0 } }, { status: 201 });
}
