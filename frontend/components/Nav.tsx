"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Current = "active" | "done" | "settings";

export default function Nav({ current }: { current: Current }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="nav">
      <h1>Tasks</h1>
      <nav className="nav-links">
        <Link href="/" className={current === "active" ? "active" : ""}>
          To do
        </Link>
        <Link href="/done" className={current === "done" ? "active" : ""}>
          Done
        </Link>
        <Link href="/settings" className={current === "settings" ? "active" : ""}>
          Settings
        </Link>
      </nav>
      <button className="ghost" onClick={logout}>
        Log out
      </button>
    </header>
  );
}
