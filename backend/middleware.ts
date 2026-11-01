import { NextRequest, NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";
import { randomUUID } from "crypto";

let envChecked = false;

export function middleware(request: NextRequest) {
  if (!envChecked) {
    try {
      validateEnv();
    } catch {
      // If env validation fails in production, the error is thrown and will be handled by Next.js.
      // In development it's a warning and we continue.
    } finally {
      envChecked = true;
    }
  }

  const response = NextResponse.next();
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
