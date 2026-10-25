import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotificationsBell from "./NotificationsBell";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubApi(notifications: unknown[], unreadCount: number) {
  const calls: { url: string; method: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url === "/api/notifications" && method === "GET") {
        return new Response(JSON.stringify({ notifications, unreadCount }), { status: 200 });
      }
      if (url === "/api/notifications/read") return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (url === "/api/realtime/config") return new Response(JSON.stringify({ channel: "x", pusher: null }), { status: 200 });
      return new Response("{}", { status: 404 });
    })
  );
  return calls;
}

describe("NotificationsBell", () => {
  it("shows the unread count as a badge", async () => {
    stubApi([{ id: "n1", type: "friend_request", data: { fromEmail: "alice@example.com" }, createdAt: "2026-01-01T00:00:00.000Z", read: false }], 1);
    render(<NotificationsBell />);
    expect(await screen.findByText("1")).toBeTruthy();
  });

  it("lists notifications with a link to the right page, and marks them read on open", async () => {
    const calls = stubApi(
      [{ id: "n1", type: "share", data: { fromEmail: "bob@example.com", kind: "board" }, createdAt: "2026-01-01T00:00:00.000Z", read: false }],
      1
    );
    render(<NotificationsBell />);
    await screen.findByText("1");

    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    // The dropdown and sheet variants are both mounted at once (CSS picks the right one per screen size).
    const rows = await screen.findAllByText("bob@example.com shared a board with you");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].closest("a")?.getAttribute("href")).toBe("/shared");
    await waitFor(() => expect(calls.some((c) => c.url === "/api/notifications/read")).toBe(true));
  });

  it("shows no badge when there is nothing unread", async () => {
    stubApi([], 0);
    render(<NotificationsBell />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy());
    expect(screen.queryByText("0")).toBeNull();
  });
});
