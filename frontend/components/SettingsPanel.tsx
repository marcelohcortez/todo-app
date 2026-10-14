"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";

interface Connection {
  clientId: string;
  clientName: string;
  connectedAt: string;
  expiresAt: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function SettingsPanel() {
  const [origin, setOrigin] = useState("");
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [connectionError, setConnectionError] = useState("");

  async function loadConnections() {
    const res = await fetch("/api/oauth/connections", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setConnections(data.connections ?? []);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    loadConnections().catch(() => setConnectionError("Could not load connected apps"));
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

  async function disconnect(connection: Connection) {
    if (!window.confirm(`Disconnect ${connection.clientName}? It will lose access to your tasks.`)) return;
    setConnectionError("");
    const res = await fetch(`/api/oauth/connections/${encodeURIComponent(connection.clientId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setConnectionError("Could not disconnect. Try again.");
      return;
    }
    await loadConnections();
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

        <section className="panel">
          <h2>Connected apps</h2>
          <p className="muted">
            Apps connected to your account with sign-in, such as claude.ai. Each one can use your tasks until
            you disconnect it or its access expires.
          </p>
          {connections === null && !connectionError && <p className="muted">Loading…</p>}
          {connections?.length === 0 && <p className="muted">No apps connected.</p>}
          {connections && connections.length > 0 && (
            <ul className="list">
              {connections.map((c) => (
                <li key={c.clientId} className="item">
                  <div className="body">
                    <span className="title">{c.clientName}</span>
                    <div className="meta">
                      <span>Connected {fmtDate(c.connectedAt)}</span>
                      <span>· Access expires {fmtDate(c.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="actions">
                    <button className="ghost danger" onClick={() => disconnect(c)}>
                      Disconnect
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {connectionError && <p className="error">{connectionError}</p>}
        </section>
      </main>
    </>
  );
}
