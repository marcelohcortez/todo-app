import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { cleanTitle, createTask, isPriority, isStatusFilter, listTasks } from "@/lib/tasks";

// GET /api/tasks?status=active|done|all
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const status = req.nextUrl.searchParams.get("status") ?? "active";
  if (!isStatusFilter(status)) {
    return NextResponse.json({ error: "status must be active, done or all" }, { status: 400 });
  }
  return NextResponse.json({ tasks: await listTasks(userId, status) });
}

// POST /api/tasks  { title, priority? }
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

  const task = await createTask(userId, title, priority);
  return NextResponse.json({ task }, { status: 201 });
}
