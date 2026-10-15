import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { boardBelongsToUser, removeBoard } from "@/lib/boards";

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
