const backendUrl = process.env.BACKEND_URL;
if (!backendUrl) {
  throw new Error("BACKEND_URL is not set (the backend's URL, e.g. https://keeptrack-api.vercel.app)");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
