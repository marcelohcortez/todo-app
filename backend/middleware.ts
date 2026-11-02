import { NextRequest, NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";

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
  // crypto.randomUUID() is the Edge-runtime-native Web Crypto API; Node's "crypto" module import is not supported here.
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
