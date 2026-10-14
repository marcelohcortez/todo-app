import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, isAllowedRedirectUri, registerClient } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Dynamic client registration (RFC 7591). Clients register here before starting sign-in.
// Registering alone grants no access: a user must still approve on the consent page.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const redirectUris: unknown[] = Array.isArray(body?.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0 || !redirectUris.every(isAllowedRedirectUri)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be HTTPS URLs (or localhost)" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const name = typeof body?.client_name === "string" ? body.client_name.trim().slice(0, 100) : "";
  const client = await registerClient(name || "MCP client", redirectUris);

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
