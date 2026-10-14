"use client";

import { useEffect } from "react";

// Registers /sw.js so the browser treats the app as installable. Nothing is cached.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
