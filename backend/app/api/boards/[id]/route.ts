import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { boardBelongsToUser, cleanBoardName, removeBoard, renameBoard } from "@/lib/boards";

// PATCH /api/boards/:id  { name } renames the board.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const name = cleanBoardName(body?.name);
  if (!name) {
    return NextResponse.json({ error: "Board name is required (max 40 characters)" }, { status: 400 });
  }

  const result = await renameBoard(userId, params.id, name);
  if (result === "not_found") {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }
  if (result === "duplicate") {
    return NextResponse.json({ error: "You already have a board with this name" }, { status: 409 });
  }
  return NextResponse.json({ board: result });
}

// DELETE /api/boards/:id  { action: "delete" } removes the board and its tasks.
// { action: "move", targetId } moves its tasks to another board first.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (body?.action === "delete") {
    if (!(await removeBoard(userId, params.id, { action: "delete" }))) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "move") {
    if (body.targetId === params.id || !(await boardBelongsToUser(userId, body.targetId))) {
      return NextResponse.json({ error: "Choose another board to move the tasks to" }, { status: 400 });
    }
    if (!(await removeBoard(userId, params.id, { action: "move", targetId: body.targetId }))) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Choose what happens to the board's tasks" }, { status: 400 });
}
