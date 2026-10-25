import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { sharedByMe } from "@/lib/shares";

// GET /api/shared/by-me?page=1
// Everything the caller has shared out, with who each item was shared with.
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const page = parsePage(req.nextUrl.searchParams.get("page"));
  return NextResponse.json(await sharedByMe(userId, page));
}
