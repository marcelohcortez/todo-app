"use client";

import { useEffect, useState } from "react";
import ChangePasswordForm from "./ChangePasswordForm";
import Nav from "./Nav";
import Button from "./ui/Button";
import { cn } from "./ui/cn";
import { card, errorText, field, headingText, mutedText, pageMain } from "./ui/styles";

const preClass =
  "mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-xs text-gray-200";

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
      <main className={cn(pageMain, "grid gap-5")}>
        <ChangePasswordForm />

        <section className={card}>
          <h2 className={headingText}>AI access (MCP)</h2>
          <p className={cn("mt-1", mutedText)}>
            Lets an AI client create, edit, complete and delete your tasks. Give each client its own token, so
            you can revoke one without affecting the others. A token is shown only once, when you create it.
          </p>
          <p className="mt-3 text-sm text-gray-300">
            Endpoint: <code className="break-all rounded bg-gray-800 px-1.5 py-0.5 text-xs text-primary-200">{mcpUrl}</code>
          </p>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              generate();
            }}
          >
            <input
              className={cn(field, "min-w-0 flex-1")}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Name, for example Claude Code"
              maxLength={40}
              aria-label="Token name"
            />
            <Button type="submit">Create token</Button>
          </form>
          {tokens === null && <p className={cn("mt-4", mutedText)}>Loading…</p>}
          {tokens?.length === 0 && <p className={cn("mt-4", mutedText)}>No tokens yet.</p>}
          {tokens && tokens.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {tokens.map((t) => (
                <li key={t.id} className="item flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                  <div className="min-w-0">
                    <span className="block break-words text-sm font-medium text-gray-100">{t.label}</span>
                    {t.createdAt && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        <span>Created {fmtDate(t.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" intent="danger" size="sm" onClick={() => revoke(t)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {token && (
            <>
              <p className="mt-5 text-sm text-gray-200">Copy this token now. You will not see it again:</p>
              <pre className={preClass}>{token}</pre>
              <div className="mt-3">
                <Button variant="soft" size="sm" onClick={copy}>
                  {copied ? "Copied" : "Copy token"}
                </Button>
              </div>
              <p className={cn("mt-4", mutedText)}>Example client configuration:</p>
              <pre className={preClass}>{config}</pre>
            </>
          )}
          {error && <p className={cn("mt-3", errorText)}>{error}</p>}
        </section>

        <section className={card}>
          <h2 className={headingText}>Connected apps</h2>
          <p className={cn("mt-1", mutedText)}>
            Apps connected to your account with sign-in, such as claude.ai. Each one can use your tasks until
            you disconnect it or its access expires.
          </p>
          {connections === null && !connectionError && <p className={cn("mt-4", mutedText)}>Loading…</p>}
          {connections?.length === 0 && <p className={cn("mt-4", mutedText)}>No apps connected.</p>}
          {connections && connections.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {connections.map((c) => (
                <li key={c.clientId} className="item flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                  <div className="min-w-0">
                    <span className="block break-words text-sm font-medium text-gray-100">{c.clientName}</span>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                      <span>Connected {fmtDate(c.connectedAt)}</span>
                      <span>· Access expires {fmtDate(c.expiresAt)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" intent="danger" size="sm" onClick={() => disconnect(c)}>
                    Disconnect
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {connectionError && <p className={cn("mt-3", errorText)}>{connectionError}</p>}
        </section>
      </main>
    </>
  );
}
