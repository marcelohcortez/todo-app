import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { findClient, issueCode, publicBaseUrl, str } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Called by the consent page when the signed-in user clicks Allow or Deny.
// Returns the URL to send the browser to: the app's redirect URI with ?code= (or ?error=).
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const p: Record<string, unknown> = (await req.json().catch(() => null)) ?? {};
  const clientId = str(p.client_id);
  const redirectUri = str(p.redirect_uri);

  // Until the redirect URI is verified as registered, errors must not be sent to it.
  const client = await findClient(clientId, redirectUri);
  if (!client) {
    return NextResponse.json(
      { error: "unknown_client", error_description: "This app is not registered for this redirect address." },
      { status: 400 }
    );
  }

  const state = str(p.state);
  const redirectWith = (params: Record<string, string>) => {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (state) url.searchParams.set("state", state);
    return NextResponse.json({ redirect: url.toString() });
  };

  if (p.decision !== "allow") return redirectWith({ error: "access_denied" });
  if (str(p.response_type) !== "code") return redirectWith({ error: "unsupported_response_type" });
  if (str(p.code_challenge_method) !== "S256" || !str(p.code_challenge)) {
    return redirectWith({ error: "invalid_request", error_description: "PKCE with S256 is required" });
  }

  const base = publicBaseUrl(req);
  const resource = str(p.resource);
  if (resource && resource !== base && resource !== `${base}/api/mcp`) {
    return redirectWith({ error: "invalid_target" });
  }

  const code = await issueCode({
    clientId,
    userId,
    redirectUri,
    codeChallenge: str(p.code_challenge),
  });
  return redirectWith({ code });
}
