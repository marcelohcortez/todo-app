import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SharedPage from "./SharedPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const EMPTY_PAGE = { page: 1, pageCount: 1 };

function stubApi(options?: {
  boards?: unknown[];
  boardTasks?: unknown[];
  onPost?: (url: string, init?: RequestInit) => void;
}) {
  const calls: { url: string; method: string; body?: string }[] = [];
  const boards = options?.boards ?? [];
  let boardTasks = options?.boardTasks ?? [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body as string | undefined });

      if (url.startsWith("/api/shared/with-me/boards/")) {
        return new Response(JSON.stringify({ tasks: boardTasks, total: boardTasks.length, ...EMPTY_PAGE }), { status: 200 });
      }
      if (url.startsWith("/api/shared/with-me/boards")) {
        return new Response(JSON.stringify({ boards, total: boards.length, ...EMPTY_PAGE }), { status: 200 });
      }
      if (url.startsWith("/api/shared/with-me/tasks")) {
        return new Response(JSON.stringify({ tasks: [], total: 0, ...EMPTY_PAGE }), { status: 200 });
      }
      if (url.startsWith("/api/shared/with-me/notes")) {
        return new Response(JSON.stringify({ notes: [], total: 0, ...EMPTY_PAGE }), { status: 200 });
      }
      if (url.startsWith("/api/shared/by-me")) {
        return new Response(JSON.stringify({ shares: [], total: 0, ...EMPTY_PAGE }), { status: 200 });
      }
      if (url === "/api/tasks" && method === "POST") {
        options?.onPost?.(url, init);
        const body = JSON.parse((init?.body as string) ?? "{}");
        const task = {
          id: "new-task",
          title: body.title,
          priority: "normal",
          boardId: body.boardId,
          completed: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
        };
        boardTasks = [...boardTasks, task];
        return new Response(JSON.stringify({ task }), { status: 200 });
      }
      if (url.startsWith("/api/tasks/") && method === "PATCH") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    })
  );
  return calls;
}

describe("SharedPage board expansion", () => {
  it("loads and shows a shared board's tasks when expanded", async () => {
    stubApi({
      boards: [{ id: "b1", name: "Groceries", createdAt: "2026-01-01T00:00:00.000Z", ownerEmail: "alice@example.com" }],
      boardTasks: [
        {
          id: "t1",
          title: "Milk",
          priority: "normal",
          boardId: "b1",
          completed: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    render(<SharedPage />);

    const toggle = await screen.findByRole("button", { name: /Groceries/ });
    expect(screen.queryByText("Milk")).toBeNull();

    fireEvent.click(toggle);
    expect(await screen.findByText("Milk")).toBeTruthy();
  });
});

describe("SharedPage adding a task to a shared board", () => {
  it("posts the new task to the open board and clears the input", async () => {
    const onPost = vi.fn();
    stubApi({
      boards: [{ id: "b1", name: "Groceries", createdAt: "2026-01-01T00:00:00.000Z", ownerEmail: "alice@example.com" }],
      boardTasks: [],
      onPost,
    });
    render(<SharedPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Groceries/ }));
    await screen.findByText("No tasks yet.");

    const input = screen.getByPlaceholderText("New task");
    fireEvent.change(input, { target: { value: "Eggs" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onPost).toHaveBeenCalled());
    const [, init] = onPost.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ title: "Eggs", boardId: "b1" });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(""));
  });
});

describe("SharedPage editing a shared task", () => {
  it("sends the edited title and leaves edit mode on save", async () => {
    const calls = stubApi({
      boards: [{ id: "b1", name: "Groceries", createdAt: "2026-01-01T00:00:00.000Z", ownerEmail: "alice@example.com" }],
      boardTasks: [
        {
          id: "t1",
          title: "Milk",
          priority: "normal",
          boardId: "b1",
          completed: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    render(<SharedPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Groceries/ }));
    await screen.findByText("Milk");

    fireEvent.click(screen.getByRole("button", { name: 'Edit "Milk"' }));
    const input = screen.getByDisplayValue("Milk");
    fireEvent.change(input, { target: { value: "Oat milk" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Exiting edit mode brings back the Edit/Delete icon buttons for the row.
    await screen.findByRole("button", { name: 'Edit "Milk"' });
    const patch = calls.find((c) => c.url === "/api/tasks/t1" && c.method === "PATCH");
    expect(patch && JSON.parse(patch.body ?? "{}")).toEqual({ title: "Oat milk" });
  });
});
