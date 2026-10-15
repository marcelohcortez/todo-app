import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { cleanBody, createNote, listNotes } from "@/lib/notes";

// GET /api/notes
export async function GET(_req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  return NextResponse.json({ notes: await listNotes(userId) });
}

// POST /api/notes  { body }
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = cleanBody((await req.json().catch(() => null))?.body);
  if (!body) {
    return NextResponse.json({ error: "Note text is required (max 20000 characters)" }, { status: 400 });
  }
  const note = await createNote(userId, body);
  return NextResponse.json({ note }, { status: 201 });
}
