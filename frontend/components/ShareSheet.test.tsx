import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareSheet from "./ShareSheet";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubApi(currentShares: { shareId: string; friendId: string; friendEmail: string }[]) {
  const calls: { url: string; method: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url === "/api/friends") {
        return new Response(
          JSON.stringify({
            friends: [
              { friendshipId: "f1", userId: "alice", email: "alice@example.com", createdAt: "2026-01-01T00:00:00.000Z" },
              { friendshipId: "f2", userId: "bob", email: "bob@example.com", createdAt: "2026-01-01T00:00:00.000Z" },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.startsWith("/api/shares?")) {
        return new Response(JSON.stringify({ shares: currentShares }), { status: 200 });
      }
      if (url === "/api/shares" || url.startsWith("/api/shares/")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    })
  );
  return calls;
}

describe("ShareSheet", () => {
  it("starts with friends already sharing the item checked", async () => {
    stubApi([{ shareId: "s1", friendId: "alice", friendEmail: "alice@example.com" }]);
    render(<ShareSheet kind="board" itemId="b1" itemLabel="Groceries" onClose={vi.fn()} />);

    const alice = (await screen.findByText("alice@example.com")).closest("label")!.querySelector("input")!;
    const bob = screen.getByText("bob@example.com").closest("label")!.querySelector("input")!;
    expect(alice.checked).toBe(true);
    expect(bob.checked).toBe(false);
  });

  it("adds a new share and removes a cleared one on save", async () => {
    const calls = stubApi([{ shareId: "s1", friendId: "alice", friendEmail: "alice@example.com" }]);
    render(<ShareSheet kind="board" itemId="b1" itemLabel="Groceries" onClose={vi.fn()} />);

    const alice = (await screen.findByText("alice@example.com")).closest("label")!.querySelector("input")!;
    const bob = screen.getByText("bob@example.com").closest("label")!.querySelector("input")!;
    fireEvent.click(alice); // uncheck
    fireEvent.click(bob); // check
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(calls.some((c) => c.url === "/api/shares" && c.method === "POST")).toBe(true));
    expect(calls.some((c) => c.url === "/api/shares/s1" && c.method === "DELETE")).toBe(true);
  });

  it("tells the user when they have no friends yet", async () => {
    stubApi([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/friends") return new Response(JSON.stringify({ friends: [] }), { status: 200 });
        if (url.startsWith("/api/shares?")) return new Response(JSON.stringify({ shares: [] }), { status: 200 });
        return new Response("{}", { status: 404 });
      })
    );
    render(<ShareSheet kind="note" itemId="n1" itemLabel="Shopping list" onClose={vi.fn()} />);
    expect(await screen.findByText(/You have no friends yet/)).toBeTruthy();
  });
});
