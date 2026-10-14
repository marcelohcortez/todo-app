import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { cleanTitle, deleteTask, isPriority, updateTask } from "@/lib/tasks";
import type { TaskPatch } from "@/lib/tasks";

// PATCH /api/tasks/:id  { title?, priority?, completed? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: TaskPatch = {};
  if (body.title !== undefined) {
    const title = cleanTitle(body.title);
    if (!title) return NextResponse.json({ error: "Title must be non-empty" }, { status: 400 });
    patch.title = title;
  }
  if (body.priority !== undefined) {
    if (!isPriority(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    patch.priority = body.priority;
  }
  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
    }
    patch.completed = body.completed;
  }

  const task = await updateTask(userId, params.id, patch);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task });
}

// DELETE /api/tasks/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const ok = await deleteTask(userId, params.id);
  if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
