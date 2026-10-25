"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Sheet from "./ui/Sheet";
import { BellIcon } from "./ui/icons";
import { mutedText } from "./ui/styles";
import { useLiveRefresh } from "./useLiveRefresh";
import type { AppNotification } from "@/lib/types";

function describe(n: AppNotification): { text: string; href: string } {
  const who = n.data.fromEmail ?? "Someone";
  if (n.type === "friend_request") return { text: `${who} wants to be friends`, href: "/friends" };
  if (n.type === "friend_accepted") return { text: `${who} accepted your friend request`, href: "/friends" };
  return { text: `${who} shared a ${n.data.kind ?? "item"} with you`, href: "/shared" };
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Unread count + a short list of recent events (friend requests, acceptances, new shares). Awareness
// only: each row links to Friends or Shared, where the actual accept/decline or viewing happens.
export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnread(data.unreadCount ?? 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      await fetch("/api/notifications/read", { method: "POST" });
    }
  }

  const list =
    notifications.length === 0 ? (
      <p className={mutedText}>No notifications yet.</p>
    ) : (
      <ul className="flex flex-col gap-1">
        {notifications.map((n) => {
          const { text, href } = describe(n);
          return (
            <li key={n.id}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2.5 py-2 text-sm text-gray-100 hover:bg-gray-800/60"
              >
                <span className="block">{text}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{fmt(n.createdAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex size-9 items-center justify-center rounded-lg text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="options-scrim fixed inset-0 z-[9] max-[720px]:hidden" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-[calc(100%+8px)] z-10 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-2 shadow-2xl shadow-black/40 max-[720px]:hidden"
            role="menu"
            aria-label="Notifications"
          >
            {list}
          </div>
        </>
      )}

      {open && (
        <Sheet label="Notifications" title="Notifications" onClose={() => setOpen(false)} backdropClassName="min-[721px]:hidden">
          {list}
        </Sheet>
      )}
    </div>
  );
}
