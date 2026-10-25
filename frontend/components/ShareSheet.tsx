"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import Sheet from "./ui/Sheet";
import { cn } from "./ui/cn";
import { errorText, mutedText } from "./ui/styles";
import type { Friend, ShareKind } from "@/lib/types";

interface ItemShare {
  shareId: string;
  friendId: string;
  friendEmail: string;
}

interface Props {
  kind: ShareKind;
  itemId: string;
  // Shown in the sheet's title, for example a task's title or a board's name.
  itemLabel: string;
  onClose: () => void;
}

async function api(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

// Lets the caller choose which friends a board, task, or note is shared with. Friends already
// sharing it start checked; saving only sends the changes (new shares added, removed ones revoked).
export default function ShareSheet({ kind, itemId, itemLabel, onClose }: Props) {
  const toast = useToast();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [current, setCurrent] = useState<ItemShare[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api("/api/friends") as Promise<{ friends: Friend[] }>,
      api(`/api/shares?kind=${kind}&itemId=${itemId}`) as Promise<{ shares: ItemShare[] }>,
    ])
      .then(([friendsData, sharesData]) => {
        setFriends(friendsData.friends);
        setCurrent(sharesData.shares);
        setChecked(new Set(sharesData.shares.map((s) => s.friendId)));
      })
      .catch(() => setError("Could not load friends"));
  }, [kind, itemId]);

  function toggle(friendId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }

  async function save() {
    if (!current) return;
    setBusy(true);
    setError("");
    const before = new Set(current.map((s) => s.friendId));
    const toAdd = [...checked].filter((id) => !before.has(id));
    const toRemove = current.filter((s) => !checked.has(s.friendId));
    try {
      await Promise.all([
        ...toAdd.map((friendId) => api("/api/shares", { method: "POST", body: JSON.stringify({ kind, itemId, friendId }) })),
        ...toRemove.map((s) => api(`/api/shares/${s.shareId}`, { method: "DELETE" })),
      ]);
      toast("Sharing updated");
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet label={`Share "${itemLabel}"`} title={`Share "${itemLabel}"`} onClose={onClose}>
      {friends === null ? (
        <p className={mutedText}>Loading…</p>
      ) : friends.length === 0 ? (
        <p className={mutedText}>
          You have no friends yet. Add one from Options &gt; Friends, then come back to share this.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {friends.map((friend) => (
            <label
              key={friend.userId}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-100 hover:bg-gray-800/60"
            >
              <input
                type="checkbox"
                className="check"
                checked={checked.has(friend.userId)}
                onChange={() => toggle(friend.userId)}
              />
              <span className="break-all">{friend.email}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className={cn("mt-3", errorText)}>{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" intent="gray" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={save} disabled={busy || !friends || friends.length === 0}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </Sheet>
  );
}
