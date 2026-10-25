import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { sharedBoardsWithMe } from "@/lib/shares";

// GET /api/shared/with-me/boards?page=1
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const page = parsePage(req.nextUrl.searchParams.get("page"));
  return NextResponse.json(await sharedBoardsWithMe(userId, page));
}
