import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FriendsPage from "./FriendsPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const EMPTY_STATE = { friends: [], incoming: [], outgoing: [] };

function stubApi(overrides: { friendsState?: unknown; calls?: { url: string; method: string }[] } = {}) {
  const calls = overrides.calls ?? [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url === "/api/auth/me") return new Response(JSON.stringify({ isAdmin: false }), { status: 200 });
      if (url === "/api/friends" && method === "GET") {
        return new Response(JSON.stringify(overrides.friendsState ?? EMPTY_STATE), { status: 200 });
      }
      if (url === "/api/friends/requests" && method === "POST") {
        return new Response(JSON.stringify({ ok: true, message: "If that email has an account, they'll receive a friend request." }), {
          status: 200,
        });
      }
      if (url.startsWith("/api/friends/") && (method === "PATCH" || method === "DELETE")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    })
  );
  return calls;
}

describe("FriendsPage", () => {
  it("shows the same generic message after adding any email", async () => {
    stubApi();
    render(<FriendsPage />);
    await screen.findByText("No friends yet. Add one above.");

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "anyone@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add friend" }));

    expect(await screen.findByText("If that email has an account, they'll receive a friend request.")).toBeTruthy();
  });

  it("shows incoming requests with Accept and Decline, and calls the right endpoints", async () => {
    const calls = stubApi({
      friendsState: {
        friends: [],
        incoming: [{ friendshipId: "f1", userId: "u1", email: "alice@example.com", createdAt: "2026-01-01T00:00:00.000Z" }],
        outgoing: [],
      },
    });
    render(<FriendsPage />);
    expect(await screen.findByText("alice@example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/friends/f1" && c.method === "PATCH")).toBe(true));
  });

  it("shows friends with a Remove button that calls DELETE after confirming", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const calls = stubApi({
      friendsState: {
        friends: [{ friendshipId: "f2", userId: "u2", email: "bob@example.com", createdAt: "2026-01-01T00:00:00.000Z" }],
        incoming: [],
        outgoing: [],
      },
    });
    render(<FriendsPage />);
    expect(await screen.findByText("bob@example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/friends/f2" && c.method === "DELETE")).toBe(true));
  });
});
