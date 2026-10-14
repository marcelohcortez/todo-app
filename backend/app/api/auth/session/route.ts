import { NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Lets the consent page check whether the user is signed in before showing Allow / Deny.
export async function GET() {
  if (!(await getCurrentUserId())) return unauthorized();
  return NextResponse.json({ ok: true });
}
