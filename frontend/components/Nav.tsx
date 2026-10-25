"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationsBell from "./NotificationsBell";
import OptionsMenu from "./OptionsMenu";
import Button from "./ui/Button";
import Sheet from "./ui/Sheet";
import { cn } from "./ui/cn";

type Current = "active" | "done" | "notes" | "settings" | "users" | "friends" | "shared";

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
  options: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// Top links: the active one gets the purple pill.
const navLink = "rounded-full px-3.5 py-1.5 text-sm font-medium text-gray-400 transition hover:text-gray-100";
const navLinkActive = "bg-primary-500/15 text-primary-200";

// Bottom bar items on phones.
const barItem = "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-gray-400 transition active:bg-gray-800";
const barItemActive = "text-primary-200";

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
  // The Options button (top bar on desktop, bottom bar on phones): Settings, Add user (admin only), Log out.
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  function openAddUser() {
    setOptionsOpen(false);
    router.push("/users");
  }

  function openFriends() {
    setOptionsOpen(false);
    router.push("/friends");
  }

  function openShared() {
    setOptionsOpen(false);
    router.push("/shared");
  }

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(Boolean(d?.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (!chooseOpen && !optionsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setChooseOpen(false);
        setOptionsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooseOpen, optionsOpen]);

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
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-gray-800/80 bg-gray-925/85 px-4 py-3 backdrop-blur-md min-[721px]:px-6">
        <h1>
          <Link href="/" aria-label="Keeptrack home" className="flex items-center">
            <img src="/logo.png" alt="Keeptrack" className="h-7 w-auto" />
          </Link>
        </h1>
        <nav aria-label="Pages" className="flex gap-1 rounded-full border border-gray-800 bg-gray-900 p-1 max-[720px]:hidden">
          <Link href="/" className={cn(navLink, current === "active" && navLinkActive)}>
            To do
          </Link>
          <Link href="/notes" className={cn(navLink, current === "notes" && navLinkActive)}>
            Notes
          </Link>
          <Link href="/done" className={cn(navLink, current === "done" && navLinkActive)}>
            Done
          </Link>
          <Link href="/shared" className={cn(navLink, current === "shared" && navLinkActive)}>
            Shared
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <div className="relative max-[720px]:hidden">
            <Button
              variant="outlined"
              intent="gray"
              size="sm"
              onClick={() => setOptionsOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={optionsOpen}
            >
              Options
            </Button>
            {optionsOpen && (
              <OptionsMenu
                variant="dropdown"
                isAdmin={isAdmin}
                onClose={() => setOptionsOpen(false)}
                onAddUser={openAddUser}
                onFriends={openFriends}
                onLogout={logout}
              />
            )}
          </div>
        </div>
      </header>

      {chooseOpen && (
        <Sheet label="Add" title="Add" onClose={() => setChooseOpen(false)}>
          <div className="grid gap-2">
            <Button size="lg" onClick={() => pick("task")}>
              New task
            </Button>
            <Button variant="outlined" intent="gray" size="lg" onClick={() => pick("note")}>
              New note
            </Button>
          </div>
        </Sheet>
      )}

      {optionsOpen && (
        <OptionsMenu
          variant="sheet"
          isAdmin={isAdmin}
          onClose={() => setOptionsOpen(false)}
          onAddUser={openAddUser}
          onFriends={openFriends}
          onShared={openShared}
          onLogout={logout}
        />
      )}

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[5] hidden grid-cols-5 items-center gap-1 rounded-2xl border border-gray-800 bg-gray-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-md max-[720px]:grid"
      >
        <Link href="/" className={cn(barItem, current === "active" && barItemActive)} aria-label="To do">
          <Icon>{ICON.home}</Icon>
          <span>To do</span>
        </Link>
        <Link href="/notes" className={cn(barItem, current === "notes" && barItemActive)} aria-label="Notes">
          <Icon>{ICON.notes}</Icon>
          <span>Notes</span>
        </Link>
        <button
          type="button"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-900/40 transition active:brightness-95"
          onClick={() => setChooseOpen(true)}
          aria-label="Add a task or a note"
        >
          <Icon>{ICON.plus}</Icon>
        </button>
        <Link href="/done" className={cn(barItem, current === "done" && barItemActive)} aria-label="Done">
          <Icon>{ICON.done}</Icon>
          <span>Done</span>
        </Link>
        <button
          type="button"
          className={cn(barItem, current === "settings" && barItemActive)}
          onClick={() => setOptionsOpen(true)}
          aria-label="Options"
        >
          <Icon>{ICON.options}</Icon>
          <span>Options</span>
        </button>
      </nav>
    </>
  );
}
