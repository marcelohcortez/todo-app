import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { changesSince } from "@/lib/notes";

// GET /api/notes/sync?since=<serverTime from the last sync>
// Without `since`, returns every note and no deletions. Used by the vault sync script.
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const raw = req.nextUrl.searchParams.get("since");
  let since: Date | null = null;
  if (raw) {
    since = new Date(raw);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "since must be an ISO date" }, { status: 400 });
    }
  }
  return NextResponse.json(await changesSince(userId, since));
}
