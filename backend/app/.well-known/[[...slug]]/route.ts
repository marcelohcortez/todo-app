import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, authServerMetadata, protectedResourceMetadata, publicBaseUrl } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Discovery documents. Clients request these with or without a path suffix,
// e.g. /.well-known/oauth-protected-resource/api/mcp.
export async function GET(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const base = publicBaseUrl(req);
  const kind = params.slug?.[0];

  let body: unknown = null;
  if (kind === "oauth-protected-resource") body = protectedResourceMetadata(base);
  if (kind === "oauth-authorization-server") body = authServerMetadata(base);
  if (!body) return new NextResponse(null, { status: 404 });

  return NextResponse.json(body, { headers: CORS_HEADERS });
}
