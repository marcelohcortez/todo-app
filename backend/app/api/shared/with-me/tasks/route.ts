import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { sharedTasksWithMe } from "@/lib/shares";

// GET /api/shared/with-me/tasks?page=1
// Tasks shared with the caller one at a time (not through a shared board).
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const page = parsePage(req.nextUrl.searchParams.get("page"));
  return NextResponse.json(await sharedTasksWithMe(userId, page));
}
