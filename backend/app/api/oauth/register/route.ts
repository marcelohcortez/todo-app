import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/http";
import { CORS_HEADERS, isAllowedRedirectUri, registerClient } from "@/lib/oauth";
import { clientIp, takeAttempt, tooManyAttempts } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// A legitimate client registers once; this only stops an IP from spamming new oauthClients docs.
const WINDOW_SECONDS = 60 * 60;

// Dynamic client registration (RFC 7591). Clients register here before starting sign-in.
// Registering alone grants no access: a user must still approve on the consent page.
export async function POST(req: NextRequest) {
  const attempt = await takeAttempt(`oauth-register:ip:${clientIp(req)}`, 10, WINDOW_SECONDS);
  if (!attempt.allowed) {
    const res = tooManyAttempts(attempt.retryAfterSeconds);
    for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
    return res;
  }

  const body = await readJsonBody(req).catch(() => null);
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
