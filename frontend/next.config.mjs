const backendUrl = process.env.BACKEND_URL;
if (!backendUrl) {
  throw new Error("BACKEND_URL is not set (the backend's URL, e.g. https://keeptrack-api.vercel.app)");
}

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The browser only talks to this app. /api/* and the OAuth discovery documents are forwarded
  // to the backend project, so the session cookie stays first-party: no CORS setup and no
  // cross-site cookie rules.
  async rewrites() {
    const target = backendUrl.replace(/\/$/, "");
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      { source: "/.well-known/:path*", destination: `${target}/.well-known/:path*` },
    ];
  },
};

export default nextConfig;
