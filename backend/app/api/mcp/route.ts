import { NextRequest, NextResponse } from "next/server";
import { handleMessage, userIdForMcpToken } from "@/lib/mcp";
import { publicBaseUrl } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// MCP endpoint (Streamable HTTP transport, JSON responses).
// Clients authenticate with: Authorization: Bearer <token from the Settings page or an OAuth access token>

export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const userId = token ? await userIdForMcpToken(token) : null;

  if (!userId) {
    // resource_metadata tells OAuth clients (claude.ai) where to start the sign-in flow.
    const metadata = `${publicBaseUrl(req)}/.well-known/oauth-protected-resource`;
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "WWW-Authenticate": `Bearer realm="todo-app", resource_metadata="${metadata}"` },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const batch = Array.isArray(body) ? body : [body];
  const responses: unknown[] = [];
  for (const message of batch) {
    const response = await handleMessage(message, userId);
    if (response !== null) responses.push(response);
  }

  // Only notifications were sent: nothing to return.
  if (responses.length === 0) return new NextResponse(null, { status: 202 });

  return NextResponse.json(Array.isArray(body) ? responses : responses[0]);
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
