import "./globals.css";
import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Keeptrack",
  description: "Simple to-do list",
  // The web app manifest is served from app/manifest.ts.
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Keeptrack", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0f1c",
};

// data-palette picks the Tailus purple palette for the primary colour (see tailwind.config.ts).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-palette="mystery">
      <body>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
