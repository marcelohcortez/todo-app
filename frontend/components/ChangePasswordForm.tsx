"use client";

import { FormEvent, useState } from "react";
import { useToast } from "./Toast";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { card, errorText, field, headingText, mutedText } from "./ui/styles";

// Shown under the fields. The server checks these too, and its message is what the user sees if one is broken.
const RULES = [
  "More than 8 characters",
  "At least one number",
  "At least one special character, such as ! or #",
  "No number used more than once",
  "No numbers in sequence, such as 123 or 987",
];

export default function ChangePasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("The new passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not change the password");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      toast("Password changed");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card}>
      <h2 className={headingText}>Change password</h2>
      <p className={cn("mt-1", mutedText)}>Enter your current password, then choose a new one.</p>
      <form onSubmit={submit} className="mt-4 grid max-w-sm gap-3">
        <input
          className={field}
          type="password"
          placeholder="Current password"
          aria-label="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <input
          className={field}
          type="password"
          placeholder="New password"
          aria-label="New password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <input
          className={field}
          type="password"
          placeholder="Confirm new password"
          aria-label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <ul className={cn("list-disc pl-5", mutedText)}>
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        {error && <p className={errorText}>{error}</p>}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
