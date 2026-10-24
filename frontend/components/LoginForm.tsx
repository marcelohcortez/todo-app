"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { authCard, authPage, errorText, field } from "./ui/styles";

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
    <main className={authPage}>
      <div className={authCard}>
        <img src="/logo.png" alt="" className="mx-auto mb-5 h-8 w-auto" />
        <h1 className="text-xl font-semibold text-gray-100">Log in</h1>
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input
            className={field}
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={field}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className={errorText}>{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className="mt-1">
            {busy ? "Please wait…" : "Log in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
