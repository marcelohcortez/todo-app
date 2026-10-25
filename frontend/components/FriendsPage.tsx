"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Nav from "./Nav";
import { useLiveRefresh } from "./useLiveRefresh";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { card, errorText, field, headingText, mutedText, pageMain } from "./ui/styles";
import type { Friend, FriendState } from "@/lib/types";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

async function api(url: string, init: RequestInit = {}): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export default function FriendsPage() {
  const [state, setState] = useState<FriendState | null>(null);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    setState(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  async function addFriend(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const { status, data } = await api("/api/friends/requests", { method: "POST", body: JSON.stringify({ email }) });
    setBusy(false);
    if (status !== 200) {
      setError(typeof data.error === "string" ? data.error : "Could not send the request");
      return;
    }
    // The same message is shown whether or not the email has an account, so this field can't be
    // used to find out who has one.
    setNotice(typeof data.message === "string" ? data.message : "If that email has an account, they'll receive a friend request.");
    setEmail("");
    load();
  }

  async function accept(friend: Friend) {
    await api(`/api/friends/${friend.friendshipId}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) });
    load();
  }

  async function decline(friend: Friend) {
    await api(`/api/friends/${friend.friendshipId}`, { method: "DELETE" });
    load();
  }

  async function removeFriend(friend: Friend) {
    if (!window.confirm(`Remove ${friend.email} as a friend? Anything shared between you will stop being shared.`)) return;
    await api(`/api/friends/${friend.friendshipId}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <Nav current="friends" />
      <main className={cn(pageMain, "grid gap-5")}>
        <section className={card}>
          <h2 className={headingText}>Add a friend</h2>
          <p className={cn("mt-1", mutedText)}>
            Enter their email. If they have an account, they'll get a request to accept before anything is shared.
          </p>
          <form className="mt-4 flex flex-wrap gap-2" onSubmit={addFriend}>
            <input
              className={cn(field, "min-w-0 flex-1")}
              type="email"
              placeholder="Email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Add friend"}
            </Button>
          </form>
          {notice && <p className={cn("mt-3", mutedText)}>{notice}</p>}
          {error && <p className={cn("mt-3", errorText)}>{error}</p>}
        </section>

        {state === null ? (
          <p className={mutedText}>Loading…</p>
        ) : (
          <>
            {(state.incoming.length > 0 || state.outgoing.length > 0) && (
              <section className={card}>
                <h2 className={headingText}>Requests</h2>
                {state.incoming.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {state.incoming.map((friend) => (
                      <li
                        key={friend.friendshipId}
                        className="item flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3"
                      >
                        <div className="min-w-0">
                          <span className="block break-all text-sm font-medium text-gray-100">{friend.email}</span>
                          <span className="text-xs text-gray-500">wants to be friends · {fmt(friend.createdAt)}</span>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" onClick={() => accept(friend)}>
                            Accept
                          </Button>
                          <Button variant="ghost" intent="gray" size="sm" onClick={() => decline(friend)}>
                            Decline
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {state.outgoing.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {state.outgoing.map((friend) => (
                      <li
                        key={friend.friendshipId}
                        className="item flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3"
                      >
                        <div className="min-w-0">
                          <span className="block break-all text-sm font-medium text-gray-100">{friend.email}</span>
                          <span className="text-xs text-gray-500">Request sent · {fmt(friend.createdAt)}</span>
                        </div>
                        <Button variant="ghost" intent="gray" size="sm" onClick={() => decline(friend)}>
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className={card}>
              <h2 className={headingText}>Friends</h2>
              {state.friends.length === 0 ? (
                <p className={cn("mt-3", mutedText)}>No friends yet. Add one above.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {state.friends.map((friend) => (
                    <li
                      key={friend.friendshipId}
                      className="item flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3"
                    >
                      <div className="min-w-0">
                        <span className="block break-all text-sm font-medium text-gray-100">{friend.email}</span>
                        <span className="text-xs text-gray-500">Friends since {fmt(friend.createdAt)}</span>
                      </div>
                      <Button variant="ghost" intent="danger" size="sm" onClick={() => removeFriend(friend)}>
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
