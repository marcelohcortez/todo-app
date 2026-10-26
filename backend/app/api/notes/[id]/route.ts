import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/http";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { cleanBody, deleteNote, getNote, updateNote } from "@/lib/notes";

// GET /api/notes/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const note = await getNote(userId, params.id);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ note });
}

// PATCH /api/notes/:id  { body }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = cleanBody((await readJsonBody(req).catch(() => null))?.body);
  if (!body) {
    return NextResponse.json({ error: "Note text is required (max 20000 characters)" }, { status: 400 });
  }
  const note = await updateNote(userId, params.id, body);
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ note });
}

// DELETE /api/notes/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const ok = await deleteNote(userId, params.id);
  if (!ok) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
