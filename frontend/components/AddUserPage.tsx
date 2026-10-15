"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Nav from "./Nav";

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
      <main className="container">
        {forbidden ? (
          <p className="muted">Only the admin can add users.</p>
        ) : users === null ? (
          // Nothing is shown until the server confirms this is the admin, so the form never flashes for anyone else.
          <p className="muted">Loading…</p>
        ) : (
          <>
            <section className="card add-user-form">
              <h2>Add user</h2>
              <form onSubmit={submit}>
                <input
                  type="email"
                  placeholder="Email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password (8 characters or more)"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" disabled={busy}>
                  {busy ? "Adding…" : "Add user"}
                </button>
              </form>
              {error && <p className="error">{error}</p>}
              {notice && <p className="muted">{notice}</p>}
            </section>

            <h2 className="users-heading">Users</h2>
            <ul className="list">
              {users.map((u) => (
                <li key={u.email} className="item">
                  <div className="body">
                    <span className="title">{u.email}</span>
                    <div className="meta">
                      {u.isAdmin && <span className="admin-tag">Admin</span>}
                      <span>Added {fmt(u.createdAt)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
