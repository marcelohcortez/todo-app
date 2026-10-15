"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";

interface McpToken {
  id: string;
  label: string;
  // Null for a token saved before named tokens existed.
  createdAt: string | null;
}

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
  const [tokens, setTokens] = useState<McpToken[] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  // The plain token of the one just created. It is shown once and never fetched again.
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
    loadTokens().catch(() => setError("Could not load settings"));
  }, []);

  async function loadTokens() {
    const res = await fetch("/api/mcp-token", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setTokens(data.tokens ?? []);
  }

  async function generate() {
    setError("");
    setCopied(false);
    const res = await fetch("/api/mcp-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Failed to create token");
    setToken(data.token);
    setNewLabel("");
    loadTokens();
  }

  // Revokes one token. The other tokens and the connected apps keep working.
  async function revoke(item: McpToken) {
    if (!window.confirm(`Revoke the token "${item.label}"? The AI client using it will lose access.`)) return;
    setError("");
    const res = await fetch(`/api/mcp-token/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (!res.ok) return setError("Could not revoke the token. Try again.");
    setToken("");
    loadTokens();
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
            Lets an AI client create, edit, complete and delete your tasks. Give each client its own token, so
            you can revoke one without affecting the others. A token is shown only once, when you create it.
          </p>
          <p>
            Endpoint: <code>{mcpUrl}</code>
          </p>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              generate();
            }}
          >
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Name, for example Claude Code"
              maxLength={40}
              aria-label="Token name"
            />
            <button type="submit">Create token</button>
          </form>
          {tokens === null && <p className="muted">Loading…</p>}
          {tokens?.length === 0 && <p className="muted">No tokens yet.</p>}
          {tokens && tokens.length > 0 && (
            <ul className="list">
              {tokens.map((t) => (
                <li key={t.id} className="item">
                  <div className="body">
                    <span className="title">{t.label}</span>
                    {t.createdAt && (
                      <div className="meta">
                        <span>Created {fmtDate(t.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="actions">
                    <button className="ghost danger" onClick={() => revoke(t)}>
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
