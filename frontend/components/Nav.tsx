"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Current = "active" | "done" | "notes" | "settings";

const ICON = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  done: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h6M9 16h6M9 8h3" />
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

interface Props {
  current: Current;
  // Pages with an inline task form pass these to open their own add sheet. Other pages go to /?add=1 or /notes?add=1.
  onAddTask?: () => void;
  onAddNote?: () => void;
}

// Top navigation on desktop; the bottom bar replaces it on phones.
// The bottom bar's + asks whether to add a task or a note.
export default function Nav({ current, onAddTask, onAddNote }: Props) {
  const router = useRouter();
  const [chooseOpen, setChooseOpen] = useState(false);

  useEffect(() => {
    if (!chooseOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChooseOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooseOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function pick(kind: "task" | "note") {
    setChooseOpen(false);
    if (kind === "task") {
      if (onAddTask) onAddTask();
      else router.push("/?add=1");
    } else {
      if (onAddNote) onAddNote();
      else router.push("/notes?add=1");
    }
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
          <Link href="/notes" className={current === "notes" ? "active" : ""}>
            Notes
          </Link>
          <Link href="/settings" className={current === "settings" ? "active" : ""}>
            Settings
          </Link>
        </nav>
        <button className="ghost nav-logout" onClick={logout}>
          Log out
        </button>
      </header>

      {chooseOpen && (
        <div className="sheet-backdrop" onClick={() => setChooseOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Add"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2>Add</h2>
              <button className="ghost" type="button" onClick={() => setChooseOpen(false)}>
                Cancel
              </button>
            </div>
            <div className="choose">
              <button type="button" onClick={() => pick("task")}>
                New task
              </button>
              <button type="button" onClick={() => pick("note")}>
                New note
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-bar" aria-label="Main">
        <Link href="/" className={current === "active" ? "active" : ""} aria-label="To do">
          <Icon>{ICON.home}</Icon>
          <span>To do</span>
        </Link>
        <button type="button" className="bottom-add" onClick={() => setChooseOpen(true)} aria-label="Add a task or a note">
          <Icon>{ICON.plus}</Icon>
        </button>
        <Link href="/done" className={current === "done" ? "active" : ""} aria-label="Done">
          <Icon>{ICON.done}</Icon>
          <span>Done</span>
        </Link>
        <Link href="/notes" className={current === "notes" ? "active" : ""} aria-label="Notes">
          <Icon>{ICON.notes}</Icon>
          <span>Notes</span>
        </Link>
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
