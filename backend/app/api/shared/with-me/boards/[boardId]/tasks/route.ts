import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { tasksOnSharedBoard } from "@/lib/shares";
import { isStatusFilter } from "@/lib/tasks";

// GET /api/shared/with-me/boards/:boardId/tasks?status=active|done|all&page=1
// One page of a board's tasks, for a board shared with the caller (or owned by them).
export async function GET(req: NextRequest, { params }: { params: { boardId: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "active";
  if (!isStatusFilter(status)) {
    return NextResponse.json({ error: "status must be active, done or all" }, { status: 400 });
  }

  const page = await tasksOnSharedBoard(userId, params.boardId, status, parsePage(searchParams.get("page")));
  if (!page) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  return NextResponse.json(page);
}
