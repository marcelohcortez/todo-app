"use client";

import { useEffect, useState } from "react";

type Params = Record<string, string>;

// Shown when an app (such as claude.ai) asks to connect to the user's tasks.
export default function AuthorizeConsent() {
  const [params, setParams] = useState<Params | null>(null);
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const all: Params = Object.fromEntries(new URLSearchParams(window.location.search));
    setParams(all);

    (async () => {
      const session = await fetch("/api/auth/session", { cache: "no-store" });
      if (session.status === 401) {
        const back = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(back)}`;
        return;
      }

      const q = new URLSearchParams({ client_id: all.client_id ?? "", redirect_uri: all.redirect_uri ?? "" });
      const res = await fetch(`/api/oauth/client?${q}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error_description ?? "This connection request is not valid.");
        return;
      }
      setClientName(data.client_name);
    })();
  }, []);

  async function decide(decision: "allow" | "deny") {
    if (!params) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/oauth/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, decision }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error_description ?? data.error ?? "Could not complete the request.");
      return;
    }
    window.location.href = data.redirect;
  }

  return (
    <main className="auth">
      <h1>Connect an app</h1>
      {error && <p className="error">{error}</p>}
      {!error && !clientName && <p className="muted">Loading…</p>}
      {clientName && (
        <>
          <p>
            <strong>{clientName}</strong> wants to view and change your tasks: list, create, edit, complete and
            delete them.
          </p>
          <div className="row">
            <button onClick={() => decide("allow")} disabled={busy}>
              Allow
            </button>
            <button className="ghost" onClick={() => decide("deny")} disabled={busy}>
              Deny
            </button>
          </div>
        </>
      )}
    </main>
  );
}
