import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { requestFriend } from "./friends";
import { handleMessage } from "./mcp";
import { shareItem } from "./shares";

const OWNER = new ObjectId().toHexString();
const FRIEND = new ObjectId().toHexString();

function seedTask() {
  const task = {
    _id: new ObjectId(),
    userId: new ObjectId(OWNER),
    title: "Milk",
    priority: "normal",
    boardId: null,
    completed: false,
    createdAt: new Date(),
    completedAt: null,
    updatedAt: new Date(),
  };
  fakeDb.seed("tasks", [task]);
  return task;
}

async function callTool(userId: string, name: string, args: Record<string, unknown>) {
  const res = (await handleMessage(
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
    userId
  )) as { result: { content: { text: string }[]; isError?: boolean } };
  return res.result;
}

beforeEach(async () => {
  for (const name of ["users", "friendships", "notifications", "shares", "boards", "tasks"]) {
    await fakeDb.collection(name).deleteMany({});
  }
  fakeDb.seed("users", [
    { _id: new ObjectId(OWNER), email: "owner@example.com" },
    { _id: new ObjectId(FRIEND), email: "friend@example.com" },
  ]);
  await requestFriend(OWNER, "friend@example.com");
  await requestFriend(FRIEND, "owner@example.com");
});

describe("MCP tools, consistent with list_tasks/list_boards: owner-only, even for a shared task", () => {
  it("refuses update_task on a task only shared with the caller", async () => {
    const task = seedTask();
    await shareItem(OWNER, FRIEND, "task", task._id.toHexString());

    const result = await callTool(FRIEND, "update_task", { id: task._id.toHexString(), title: "Oat milk" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("task not found");
  });

  it("refuses set_task_completed on a task only shared with the caller", async () => {
    const task = seedTask();
    await shareItem(OWNER, FRIEND, "task", task._id.toHexString());

    const result = await callTool(FRIEND, "set_task_completed", { id: task._id.toHexString(), completed: true });
    expect(result.isError).toBe(true);
  });

  it("refuses delete_task on a task only shared with the caller", async () => {
    const task = seedTask();
    await shareItem(OWNER, FRIEND, "task", task._id.toHexString());

    const result = await callTool(FRIEND, "delete_task", { id: task._id.toHexString() });
    expect(result.isError).toBe(true);
  });

  it("still lets the owner update their own task", async () => {
    const task = seedTask();
    const result = await callTool(OWNER, "update_task", { id: task._id.toHexString(), title: "Oat milk" });
    expect(result.isError).toBeUndefined();
  });
});
