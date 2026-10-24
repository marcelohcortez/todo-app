import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Lets the browser offer "Install app" or "Add to Home Screen".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keeptrack",
    short_name: "Keeptrack",
    description: "Simple to-do list",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0f1c",
    theme_color: "#0b0f1c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
