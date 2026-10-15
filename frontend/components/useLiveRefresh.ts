"use client";

import PusherJs from "pusher-js";
import { useEffect, useRef } from "react";

interface RealtimeConfig {
  channel: string;
  pusher: { key: string; cluster: string } | null;
}

/**
 * Calls `onChange` when this user's tasks or notes change on any device, and when the page comes back into view.
 * Missed events (for example while the phone was asleep) are covered by the refresh on focus.
 */
export function useLiveRefresh(onChange: () => void) {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let client: PusherJs | null = null;
    const refresh = () => latest.current();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    fetch("/api/realtime/config", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<RealtimeConfig>) : null))
      .then((config) => {
        if (cancelled || !config?.pusher) return;
        client = new PusherJs(config.pusher.key, {
          cluster: config.pusher.cluster,
          channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
        });
        client.subscribe(config.channel).bind("changed", refresh);
      })
      .catch(() => {
        // Without live updates the lists still refresh on focus.
      });

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      client?.disconnect();
    };
  }, []);
}
