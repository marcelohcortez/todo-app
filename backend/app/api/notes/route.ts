import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { cleanBody, createNote, listNotes } from "@/lib/notes";

// GET /api/notes?page=1  → one page of 20 notes, with the total and the number of pages
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await listNotes(userId, parsePage(req.nextUrl.searchParams.get("page"))));
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
