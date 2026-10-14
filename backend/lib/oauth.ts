import { createHash, randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import type { NextRequest } from "next/server";
import { getDb } from "./mongodb";

// Access tokens last 90 days. A client that gets an expired token asks the user to connect again.
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;
// An authorization code is only valid long enough to be exchanged for a token.
const CODE_TTL_SECONDS = 60 * 5;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export interface OAuthClientDoc {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt: Date;
}

export interface OAuthCodeDoc {
  codeHash: string;
  clientId: string;
  userId: ObjectId;
  redirectUri: string;
  codeChallenge: string;
  expiresAt: Date;
}

export interface OAuthTokenDoc {
  tokenHash: string;
  clientId: string;
  userId: ObjectId;
  expiresAt: Date;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// ---------- storage ----------

let indexesReady = false;

async function collections() {
  const db = await getDb();
  const clients = db.collection<OAuthClientDoc>("oauthClients");
  const codes = db.collection<OAuthCodeDoc>("oauthCodes");
  const tokens = db.collection<OAuthTokenDoc>("oauthTokens");
  if (!indexesReady) {
    await clients.createIndex({ clientId: 1 }, { unique: true });
    await codes.createIndex({ codeHash: 1 }, { unique: true });
    await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await tokens.createIndex({ tokenHash: 1 }, { unique: true });
    await tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    indexesReady = true;
  }
  return { clients, codes, tokens };
}

// ---------- URLs ----------

/** The public origin the browser and Claude use, e.g. https://todo-app.vercel.app (the frontend). */
export function publicBaseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

// ---------- discovery documents (RFC 9728 and RFC 8414) ----------

export function protectedResourceMetadata(base: string) {
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    resource_name: "Tasks",
  };
}

export function authServerMetadata(base: string) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}

// ---------- clients (RFC 7591) ----------

// Hosts an app may redirect the approval code to. Anything else is refused, so an unknown app
// cannot receive a code even if the user clicks Allow. Add other AIs' callback hosts with
// ALLOWED_REDIRECT_HOSTS (comma-separated, e.g. "chatgpt.com,example.ai").
const DEFAULT_REDIRECT_HOSTS = ["claude.ai", "claude.com"];

function allowedRedirectHosts(): string[] {
  const extra = (process.env.ALLOWED_REDIRECT_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_REDIRECT_HOSTS, ...extra];
}

/**
 * Redirect URIs must be HTTPS on an allowed host, with no fragment.
 * Plain HTTP is allowed only for localhost, which only the user's own machine can reach.
 */
export function isAllowedRedirectUri(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.hash) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return url.protocol === "http:" || url.protocol === "https:";
    return url.protocol === "https:" && allowedRedirectHosts().includes(host);
  } catch {
    return false;
  }
}

export async function registerClient(clientName: string, redirectUris: string[]): Promise<OAuthClientDoc> {
  const client: OAuthClientDoc = {
    clientId: "tdc_" + randomBytes(16).toString("hex"),
    clientName,
    redirectUris,
    createdAt: new Date(),
  };
  await (await collections()).clients.insertOne(client);
  return client;
}

/** Returns the client only if the redirect URI is one it registered (exact match). */
export async function findClient(clientId: string, redirectUri: string): Promise<OAuthClientDoc | null> {
  if (!clientId || !redirectUri || !isAllowedRedirectUri(redirectUri)) return null;
  const client = await (await collections()).clients.findOne({ clientId });
  if (!client || !client.redirectUris.includes(redirectUri)) return null;
  return client;
}

// ---------- authorization codes ----------

export async function issueCode(params: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
}): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  await (await collections()).codes.insertOne({
    codeHash: sha256(code),
    clientId: params.clientId,
    userId: new ObjectId(params.userId),
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
  });
  return code;
}

/** Single use: the code is deleted as it is read, so a replay finds nothing. */
export async function consumeCode(code: string) {
  return (await collections()).codes.findOneAndDelete({
    codeHash: sha256(code),
    expiresAt: { $gt: new Date() },
  });
}

/** PKCE (RFC 7636) with the S256 method. */
export function pkceMatches(verifier: string, challenge: string): boolean {
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
}

// ---------- access tokens ----------

export async function issueAccessToken(clientId: string, userId: string): Promise<string> {
  const token = "oat_" + randomBytes(32).toString("hex");
  await (await collections()).tokens.insertOne({
    tokenHash: sha256(token),
    clientId,
    userId: new ObjectId(userId),
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
  });
  return token;
}

/** Disconnects every app that was granted access as this user. */
export async function revokeAccessTokensForUser(userId: string): Promise<void> {
  await (await collections()).tokens.deleteMany({ userId: new ObjectId(userId) });
}

export async function userIdForAccessToken(token: string): Promise<string | null> {
  const doc = await (await collections()).tokens.findOne({
    tokenHash: sha256(token),
    expiresAt: { $gt: new Date() },
  });
  return doc ? doc.userId.toHexString() : null;
}
