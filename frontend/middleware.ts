import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://todo-app-backend-marcelo-cortezs-projects.vercel.app';

// Paths that don't need API proxying
const SKIP_PATHS = ['/api/health'];

// Build the full backend URL for a given request path
function buildBackendUrl(request: NextRequest, targetPath: string): string {
  const backend = `${BACKEND_URL}${targetPath}`;
  const query = request.url.split('?')[1];
  return query ? `${backend}?${query}` : backend;
}

// Forward request to backend with CORS headers
async function forwardToBackend(request: NextRequest, targetPath: string): Promise<NextResponse> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Forward headers that are important for auth
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('host', new URL(BACKEND_URL).host);

  // Copy cookie for auth
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  // Copy authorization
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'manual',
  };

  const response = await fetch(buildBackendUrl(request, targetPath), fetchOptions);
  const responseHeaders = new Headers(response.headers);

  // Set CORS headers for browser access
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', '*');
  responseHeaders.set('Vary', 'Origin');

  // Handle redirect responses from backend
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (location) {
      return new NextResponse(null, {
        status: response.status,
        headers: {
          ...Object.fromEntries(responseHeaders.entries()),
          Location: location,
        },
      });
    }
  }

  const responseText = await response.text();

  return new NextResponse(responseText, {
    status: response.status,
    headers: {
      ...Object.fromEntries(responseHeaders.entries()),
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip non-API paths that aren't in the skip list
  if (!path.startsWith('/api/') || SKIP_PATHS.includes(path)) {
    // Handle OAuth discovery paths
    if (path.startsWith('/.well-known/')) {
      return forwardToBackend(request, path);
    }
    return NextResponse.next();
  }

  return forwardToBackend(request, path);
}

export const config = {
  matcher: ['/api/:path*', '/.well-known/:path*'],
};
