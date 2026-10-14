import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Lets the browser offer "Install app" or "Add to Home Screen".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tasks",
    short_name: "Tasks",
    description: "Simple to-do list",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d16",
    theme_color: "#0d0d16",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
