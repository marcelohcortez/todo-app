// Applied to every response: standard hardening against clickjacking, MIME-sniffing, and
// leaking the URL to third parties via Referer.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  optimizePackageImports: ['@tailus/themer', 'clsx', 'pusher-js'],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // /api/* and /.well-known/* are proxied to the backend via middleware.ts (not rewrites).
  // Rewrites on Vercel route cross-project calls through vercel.com/sso-api, which breaks CORS.
  // Middleware proxies with proper CORS headers, avoiding the SSO gateway entirely.
};

export default nextConfig;
