import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { createTask } from "./tasks";

const OWNER = new ObjectId().toHexString();

beforeEach(async () => {
  await fakeDb.collection("boards").deleteMany({});
});

describe("createTask without a boardId", () => {
  it("uses the user's existing \"general\" board", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "General", createdAt: new Date() };
    fakeDb.seed("boards", [board]);

    const task = await createTask(OWNER, "Milk", "normal", null);
    expect(task.boardId).toBe(board._id.toHexString());
  });

  it("leaves the task without a board when the user has no \"general\" board", async () => {
    const task = await createTask(OWNER, "Milk", "normal", null);
    expect(task.boardId).toBeNull();
  });
});
