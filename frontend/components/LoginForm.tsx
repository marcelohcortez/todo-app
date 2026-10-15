"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    // Return to where the user was sent from (e.g. the OAuth consent page). Only same-site paths.
    const next = new URLSearchParams(window.location.search).get("next") ?? "";
    const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.replace(target);
    router.refresh();
  }

  return (
    <main className="auth">
      <h1>Log in</h1>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
