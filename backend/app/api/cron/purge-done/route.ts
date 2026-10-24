import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredDoneTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

// GET /api/cron/purge-done. Vercel Cron calls this daily. It deletes completed tasks older than the retention
// period for every user. Vercel sends CRON_SECRET as the bearer token, so nobody else can run it.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const deleted = await purgeExpiredDoneTasks();
  return NextResponse.json({ deleted });
}
