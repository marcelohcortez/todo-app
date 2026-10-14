import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks API",
  robots: { index: false, follow: false },
};

// The backend has no UI. The layout is required by the App Router.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
