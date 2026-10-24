"use client";

import { useEffect, useState } from "react";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { authCard, authPage, errorText, mutedText } from "./ui/styles";

type Params = Record<string, string>;

function redirectHost(redirectUri: string | undefined): string {
  try {
    return new URL(redirectUri ?? "").host;
  } catch {
    return "an unknown address";
  }
}

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
    <main className={authPage}>
      <div className={cn(authCard, "text-left")}>
        <h1 className="text-xl font-semibold text-gray-100">Connect an app</h1>
        {error && <p className={cn("mt-4", errorText)}>{error}</p>}
        {!error && !clientName && <p className={cn("mt-4", mutedText)}>Loading…</p>}
        {clientName && (
          <>
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              <strong className="font-semibold text-gray-100">{clientName}</strong> wants to view and change your
              tasks: list, create, edit, complete and delete them.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              Approving sends access to{" "}
              <strong className="break-all font-semibold text-gray-100">{redirectHost(params?.redirect_uri)}</strong>.
              Only approve if you started this connection yourself.
            </p>
            <div className="mt-6 flex gap-2">
              <Button className="flex-1" onClick={() => decide("allow")} disabled={busy}>
                Allow
              </Button>
              <Button className="flex-1" variant="outlined" intent="gray" onClick={() => decide("deny")} disabled={busy}>
                Deny
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
