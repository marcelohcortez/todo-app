"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Current = "active" | "done" | "settings";

const ICON = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  done: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  settings: (
    <>
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />,
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// Top navigation on desktop; the bottom bar replaces it on phones.
// onAdd opens the add sheet on the To do page. Other pages send the user to /?add=1.
export default function Nav({ current, onAdd }: { current: Current; onAdd?: () => void }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function add() {
    if (onAdd) onAdd();
    else router.push("/?add=1");
  }

  return (
    <>
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
        <button className="ghost nav-logout" onClick={logout}>
          Log out
        </button>
      </header>

      <nav className="bottom-bar" aria-label="Main">
        <Link href="/" className={current === "active" ? "active" : ""} aria-label="To do">
          <Icon>{ICON.home}</Icon>
          <span>To do</span>
        </Link>
        <Link href="/done" className={current === "done" ? "active" : ""} aria-label="Done">
          <Icon>{ICON.done}</Icon>
          <span>Done</span>
        </Link>
        <button type="button" className="bottom-add" onClick={add} aria-label="Add a task">
          <Icon>{ICON.plus}</Icon>
        </button>
        <Link href="/settings" className={current === "settings" ? "active" : ""} aria-label="Settings">
          <Icon>{ICON.settings}</Icon>
          <span>Settings</span>
        </Link>
        <button type="button" className="bottom-logout" onClick={logout} aria-label="Log out">
          <Icon>{ICON.logout}</Icon>
          <span>Log out</span>
        </button>
      </nav>
    </>
  );
}
