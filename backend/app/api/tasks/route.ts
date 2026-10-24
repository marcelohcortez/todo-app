import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { boardBelongsToUser } from "@/lib/boards";
import { parsePage } from "@/lib/pagination";
import { searchQuery } from "@/lib/search";
import { cleanTitle, createTask, isPriority, isStatusFilter, listTaskPage } from "@/lib/tasks";

// GET /api/tasks?status=active|done|all&page=1&boardId=<id>|none&q=<text>
// Returns one page of 20 tasks, with the total count and the number of pages.
// boardId limits the list to one board; "none" means tasks with no board.
// q keeps the tasks whose title contains the text. Text under 3 characters is ignored.
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const params = req.nextUrl.searchParams;
  const status = params.get("status") ?? "active";
  if (!isStatusFilter(status)) {
    return NextResponse.json({ error: "status must be active, done or all" }, { status: 400 });
  }

  const boardParam = params.get("boardId");
  let boardId: string | null | undefined;
  if (boardParam === "none") boardId = null;
  else if (boardParam !== null) {
    if (!ObjectId.isValid(boardParam)) {
      return NextResponse.json({ error: "Invalid board" }, { status: 400 });
    }
    boardId = boardParam;
  }

  const query = searchQuery(params.get("q"));
  return NextResponse.json(await listTaskPage(userId, status, boardId, parsePage(params.get("page")), query));
}

// POST /api/tasks  { title, priority?, boardId? }
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const title = cleanTitle(body?.title);
  if (!title) {
    return NextResponse.json({ error: "Title is required (max 500 characters)" }, { status: 400 });
  }
  const priority = body?.priority ?? "normal";
  if (!isPriority(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }
  const boardId = body?.boardId ?? null;
  if (boardId !== null && !(await boardBelongsToUser(userId, boardId))) {
    return NextResponse.json({ error: "Board not found" }, { status: 400 });
  }

  const task = await createTask(userId, title, priority, boardId);
  return NextResponse.json({ task }, { status: 201 });
}
