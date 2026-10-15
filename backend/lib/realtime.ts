import Pusher from "pusher";

// Live updates: after a task or note changes, the server tells that user's open devices, which then reload their lists.
// Each user has a private channel, so only that user's signed-in devices can listen.

let client: Pusher | null | undefined;

function pusherConfig() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) return null;
  return { appId, key, secret, cluster };
}

// Returns null when Pusher is not configured. The app then still works, without live updates.
function pusher(): Pusher | null {
  if (client === undefined) {
    const cfg = pusherConfig();
    client = cfg ? new Pusher({ ...cfg, useTLS: true }) : null;
  }
  return client;
}

export function userChannel(userId: string): string {
  return `private-user-${userId}`;
}

/** The public parts the browser needs to connect. The secret is never returned. */
export function publicPusherConfig(): { key: string; cluster: string } | null {
  const cfg = pusherConfig();
  return cfg ? { key: cfg.key, cluster: cfg.cluster } : null;
}

/** Returns the Pusher auth response for the browser, or null if the request is not allowed. */
export function authorizeUserChannel(userId: string, socketId: string, channel: string): unknown | null {
  if (channel !== userChannel(userId)) return null;
  const p = pusher();
  if (!p) return null;
  return p.authorizeChannel(socketId, channel);
}

/** Tells this user's open devices that their tasks or notes changed. A failure is logged, never thrown. */
export async function notifyChanged(userId: string): Promise<void> {
  const p = pusher();
  if (!p) return;
  try {
    await p.trigger(userChannel(userId), "changed", {});
  } catch (err) {
    console.error("Pusher notify failed:", err);
  }
}
