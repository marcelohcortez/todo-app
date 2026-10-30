import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/http";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  CORS_HEADERS,
  consumeCode,
  issueAccessToken,
  pkceMatches,
  str,
} from "@/lib/oauth";
import { clientIp, takeAttempt, tooManyAttempts } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const NO_STORE = { ...CORS_HEADERS, "Cache-Control": "no-store" };
// A code exchange is normally one try per sign-in; this only stops an IP hammering the endpoint
// to guess code_verifier values or exhaust codes before the real client can redeem them.
const WINDOW_SECONDS = 15 * 60;

// Exchanges an authorization code for an access token (OAuth 2.1, PKCE required).
export async function POST(req: NextRequest) {
  const attempt = await takeAttempt(`oauth-token:ip:${clientIp(req)}`, 20, WINDOW_SECONDS);
  if (!attempt.allowed) {
    const res = tooManyAttempts(attempt.retryAfterSeconds);
    for (const [key, value] of Object.entries(NO_STORE)) res.headers.set(key, value);
    return res;
  }

  const isJson = req.headers.get("content-type")?.includes("application/json");
  const p: Record<string, unknown> = isJson
    ? ((await readJsonBody(req).catch(() => null)) ?? {})
    : Object.fromEntries(new URLSearchParams(await req.text()));

  if (str(p.grant_type) !== "authorization_code") {
    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "grant_type must be authorization_code" },
      { status: 400, headers: NO_STORE }
    );
  }

  const code = str(p.code);
  const verifier = str(p.code_verifier);
  if (!code || !verifier) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "code and code_verifier are required" },
      { status: 400, headers: NO_STORE }
    );
  }

  // consumeCode deletes the code, so it cannot be used twice even if the checks below fail.
  const stored = await consumeCode(code);
  if (
    !stored ||
    stored.clientId !== str(p.client_id) ||
    stored.redirectUri !== str(p.redirect_uri) ||
    !pkceMatches(verifier, stored.codeChallenge)
  ) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "The authorization code is invalid, expired or already used" },
      { status: 400, headers: NO_STORE }
    );
  }

  const accessToken = await issueAccessToken(stored.clientId, stored.userId.toHexString());
  return NextResponse.json(
    { access_token: accessToken, token_type: "Bearer", expires_in: ACCESS_TOKEN_TTL_SECONDS },
    { headers: NO_STORE }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
