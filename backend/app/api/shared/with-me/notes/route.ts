import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { sharedNotesWithMe } from "@/lib/shares";

// GET /api/shared/with-me/notes?page=1
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const page = parsePage(req.nextUrl.searchParams.get("page"));
  return NextResponse.json(await sharedNotesWithMe(userId, page));
}
