"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";

export default function SettingsPanel() {
  const [origin, setOrigin] = useState("");
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/mcp-token", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setHasToken(Boolean(d.hasToken));
      })
      .catch(() => setError("Could not load settings"));
  }, []);

  async function generate() {
    setError("");
    setCopied(false);
    const res = await fetch("/api/mcp-token", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Failed to create token");
    setToken(data.token);
    setHasToken(true);
  }

  async function revoke() {
    if (!window.confirm("Revoke the MCP token? Any AI client using it, including claude.ai, will lose access.")) return;
    await fetch("/api/mcp-token", { method: "DELETE" });
    setToken("");
    setHasToken(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  const mcpUrl = `${origin}/api/mcp`;
  const config = JSON.stringify(
    {
      mcpServers: {
        todo: {
          type: "http",
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token || "<YOUR_TOKEN>"}` },
        },
      },
    },
    null,
    2
  );

  return (
    <>
      <Nav current="settings" />
      <main className="container">
        <section className="panel">
          <h2>AI access (MCP)</h2>
          <p className="muted">
            Lets an AI client create, edit, complete and delete your tasks. The token is shown only once
            when you create it. Creating a new one replaces the old one.
          </p>
          <p>
            Endpoint: <code>{mcpUrl}</code>
          </p>
          <div className="row">
            <button onClick={generate}>{hasToken ? "Create new token" : "Create token"}</button>
            {hasToken && (
              <button className="ghost danger" onClick={revoke}>
                Revoke token
              </button>
            )}
          </div>
          {hasToken === false && !token && <p className="muted">No token yet.</p>}
          {token && (
            <>
              <p>Copy this token now. You will not see it again:</p>
              <pre className="token">{token}</pre>
              <div className="row">
                <button onClick={copy}>{copied ? "Copied" : "Copy token"}</button>
              </div>
              <p className="muted">Example client configuration:</p>
              <pre className="token">{config}</pre>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    </>
  );
}
