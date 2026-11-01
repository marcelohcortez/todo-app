/** Lightweight structured logger. Output is JSON when LOG_FORMAT=json (for Vercel/Cloud logging),
 * otherwise plain text for local development readability. */

type Level = "debug" | "info" | "warn" | "error";

interface LogMeta {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

// Simple ID generator for request correlation.
let _counter = 0;
function requestId(): string {
  _counter++;
  return `req-${Date.now()}-${_counter}`;
}

function formatMeta(meta: LogMeta): string {
  const parts: string[] = [];
  if (meta.requestId) parts.push(`req=${meta.requestId}`);
  if (meta.userId) parts.push(`user=${meta.userId}`);
  return parts.join(" ");
}

export function log(level: Level, message: string, meta: LogMeta = {}) {
  const ts = new Date().toISOString();
  const id = meta.requestId ?? requestId();
  const metaStr = formatMeta({ ...meta, requestId: id });

  if (process.env.LOG_FORMAT === "json") {
    const payload: Record<string, unknown> = { level, ts, message, ...meta };
    // Strip requestId from the JSON payload if it's the auto-generated one (not from context).
    if (meta.requestId === undefined) {
      delete payload.requestId;
    }
    console.log(JSON.stringify(payload));
  } else {
    console[level](ts, `[${level.toUpperCase()}]`, `"${message}"`, metaStr || "");
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
  error: (message: string, meta?: LogMeta) => log("error", message, meta),
};
