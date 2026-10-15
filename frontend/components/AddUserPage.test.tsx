import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddUserPage from "./AddUserPage";

// The page renders Nav, which needs the Next.js router. The navigation itself is not under test here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Answers the requests the page makes, with the given response for /api/users.
function stubApi(usersStatus: number, usersBody: unknown, isAdmin: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/auth/me") {
        return new Response(JSON.stringify({ email: "x@example.com", isAdmin }), { status: 200 });
      }
      if (url === "/api/users") {
        return new Response(JSON.stringify(usersBody), { status: usersStatus });
      }
      return new Response("{}", { status: 404 });
    })
  );
}

describe("AddUserPage", () => {
  it("shows only a message to a non-admin, with no form", async () => {
    stubApi(403, { error: "Only the admin can see users" }, false);
    render(<AddUserPage />);
    expect(await screen.findByText("Only the admin can add users.")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Email")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add user" })).toBeNull();
  });

  it("shows the form and the existing users to the admin", async () => {
    stubApi(
      200,
      {
        users: [
          { email: "admin@example.com", createdAt: "2026-01-01T10:00:00.000Z", isAdmin: true },
          { email: "friend@example.com", createdAt: "2026-02-01T10:00:00.000Z", isAdmin: false },
        ],
      },
      true
    );
    render(<AddUserPage />);
    expect(await screen.findByText("friend@example.com")).toBeTruthy();
    expect(screen.getByText("admin@example.com")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add user" })).toBeTruthy();
    expect(screen.getAllByText(/^Added /)).toHaveLength(2);
  });

  it("does not show the form before the server has answered", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<AddUserPage />);
    await waitFor(() => expect(screen.getByText("Loading…")).toBeTruthy());
    expect(screen.queryByPlaceholderText("Email")).toBeNull();
  });
});
