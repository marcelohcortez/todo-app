import { NextRequest, NextResponse } from "next/server";
import { findClient } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Public details for the consent page: the app's name, shown only for a registered redirect URI.
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id") ?? "";
  const redirectUri = req.nextUrl.searchParams.get("redirect_uri") ?? "";

  const client = await findClient(clientId, redirectUri);
  if (!client) {
    return NextResponse.json(
      { error: "unknown_client", error_description: "This app is not registered for this redirect address." },
      { status: 400 }
    );
  }
  return NextResponse.json({ client_name: client.clientName });
}
