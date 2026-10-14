const backendUrl = process.env.BACKEND_URL;
if (!backendUrl) {
  throw new Error("BACKEND_URL is not set (the backend's URL, e.g. https://todo-api.vercel.app)");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The browser only talks to this app. /api/* is forwarded to the backend project,
  // so the session cookie stays first-party: no CORS setup and no cross-site cookie rules.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
