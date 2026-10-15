"use client";

import { FormEvent, useState } from "react";

interface Props {
  onClose: () => void;
}

// The admin's "Add user" sheet. Creates an account; the admin stays signed in as themselves.
export default function AddUserSheet({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setAdded("");
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
    setAdded(`${data.user.email} can now log in.`);
    setEmail("");
    setPassword("");
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Add user"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2>Add user</h2>
          <button className="ghost" type="button" onClick={onClose}>
            Done
          </button>
        </div>
        <form className="add-sheet" onSubmit={submit}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
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
        {added && <p className="muted">{added}</p>}
      </div>
    </div>
  );
}
