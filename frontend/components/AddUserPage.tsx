"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Nav from "./Nav";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { badgeClass, card, errorText, field, headingText, mutedText, pageMain } from "./ui/styles";

interface UserSummary {
  email: string;
  createdAt: string;
  isAdmin: boolean;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// The admin's page for adding accounts. Lists the accounts that already exist.
export default function AddUserPage() {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    const data = await res.json();
    setUsers(data.users);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not add the user");
      return;
    }
    setNotice(`${data.user.email} can now log in.`);
    setEmail("");
    setPassword("");
    load();
  }

  return (
    <>
      <Nav current="users" />
      <main className={cn(pageMain, "grid gap-5")}>
        {forbidden ? (
          <p className={mutedText}>Only the admin can add users.</p>
        ) : users === null ? (
          // Nothing is shown until the server confirms this is the admin, so the form never flashes for anyone else.
          <p className={mutedText}>Loading…</p>
        ) : (
          <>
            <section className={card}>
              <h2 className={headingText}>Add user</h2>
              <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  className={field}
                  type="email"
                  placeholder="Email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className={field}
                  type="password"
                  placeholder="Password (8 characters or more)"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" disabled={busy}>
                  {busy ? "Adding…" : "Add user"}
                </Button>
              </form>
              {error && <p className={cn("mt-3", errorText)}>{error}</p>}
              {notice && <p className={cn("mt-3", mutedText)}>{notice}</p>}
            </section>

            <div>
              <h2 className={headingText}>Users</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {users.map((u) => (
                  <li key={u.email} className="item flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3.5 shadow-lg shadow-black/10">
                    <div className="min-w-0">
                      <span className="block break-all text-sm font-medium text-gray-100">{u.email}</span>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {u.isAdmin && <span className={badgeClass("board")}>Admin</span>}
                        <span>Added {fmt(u.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>
    </>
  );
}
