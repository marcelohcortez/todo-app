import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { requestFriend } from "./friends";
import { resolveTaskAccess, shareItem } from "./shares";
import { createTask, deleteTask, updateTask } from "./tasks";

const OWNER = new ObjectId().toHexString();
const FRIEND = new ObjectId().toHexString();
const STRANGER = new ObjectId().toHexString();

function seedBoard() {
  const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
  fakeDb.seed("boards", [board]);
  return board;
}

function seedTask(boardId: ObjectId | null) {
  const task = {
    _id: new ObjectId(),
    userId: new ObjectId(OWNER),
    title: "Milk",
    priority: "normal",
    boardId,
    completed: false,
    createdAt: new Date(),
    completedAt: null,
    updatedAt: new Date(),
  };
  fakeDb.seed("tasks", [task]);
  return task;
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

describe("updateTask with a friend acting on a shared task", () => {
  it("lets a friend with a direct task share edit it", async () => {
    const task = seedTask(null);
    await shareItem(OWNER, FRIEND, "task", task._id.toHexString());

    const updated = await updateTask(FRIEND, task._id.toHexString(), { title: "Oat milk" });
    expect(updated?.title).toBe("Oat milk");
  });

  it("lets a friend with access via the task's board edit it", async () => {
    const board = seedBoard();
    const task = seedTask(board._id);
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());

    const updated = await updateTask(FRIEND, task._id.toHexString(), { completed: true });
    expect(updated?.completed).toBe(true);
  });

  it("refuses someone with no access", async () => {
    const task = seedTask(null);
    expect(await updateTask(STRANGER, task._id.toHexString(), { title: "nope" })).toBeNull();
  });
});

describe("createTask on a shared board", () => {
  it("is visible to a friend with board access, whoever performed the create", async () => {
    const board = seedBoard();
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());

    // The route resolves the board's real owner before calling createTask; this is that call.
    const task = await createTask(OWNER, "Milk", "normal", board._id.toHexString());
    expect(await resolveTaskAccess(FRIEND, task.id)).toEqual({ ownerId: OWNER });
  });
});

describe("deleteTask with a friend acting on a shared task", () => {
  it("lets a friend with board access delete a task on that board", async () => {
    const board = seedBoard();
    const task = seedTask(board._id);
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());

    expect(await deleteTask(FRIEND, task._id.toHexString())).toBe(true);
    expect(await updateTask(OWNER, task._id.toHexString(), { title: "x" })).toBeNull();
  });

  it("refuses someone with no access", async () => {
    const task = seedTask(null);
    expect(await deleteTask(STRANGER, task._id.toHexString())).toBe(false);
  });
});
