import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { requestFriend } from "./friends";
import { shareItem } from "./shares";
import { cleanBoardName, removeBoard, toBoard } from "./boards";

const OWNER = new ObjectId().toHexString();
const FRIEND = new ObjectId().toHexString();

describe("cleanBoardName", () => {
  it("trims the name", () => {
    expect(cleanBoardName("  Work ")).toBe("Work");
  });

  it("rejects empty, blank, non-string and names over 40 characters", () => {
    expect(cleanBoardName("")).toBeNull();
    expect(cleanBoardName("  ")).toBeNull();
    expect(cleanBoardName(1)).toBeNull();
    expect(cleanBoardName("x".repeat(41))).toBeNull();
    expect(cleanBoardName("x".repeat(40))).toHaveLength(40);
  });
});

describe("toBoard", () => {
  it("maps the document to the API shape", () => {
    const id = new ObjectId();
    expect(
      toBoard({ _id: id, userId: new ObjectId(), name: "Home", createdAt: new Date("2026-04-01T00:00:00.000Z") })
    ).toEqual({ id: id.toHexString(), name: "Home", createdAt: "2026-04-01T00:00:00.000Z" });
  });
});

describe("removeBoard moving tasks to another board", () => {
  beforeEach(async () => {
    for (const name of ["users", "friendships", "shares", "boards", "tasks"]) {
      await fakeDb.collection(name).deleteMany({});
    }
    fakeDb.seed("users", [
      { _id: new ObjectId(OWNER), email: "owner@example.com" },
      { _id: new ObjectId(FRIEND), email: "friend@example.com" },
    ]);
    await requestFriend(OWNER, "friend@example.com");
    await requestFriend(FRIEND, "owner@example.com");
  });

  it("pings a friend with a direct share on one of the moved tasks", async () => {
    const realtime = await import("./realtime");
    const spy = vi.spyOn(realtime, "notifyChanged").mockResolvedValue();

    const source = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Old", createdAt: new Date() };
    const target = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "New", createdAt: new Date() };
    fakeDb.seed("boards", [source, target]);
    const task = {
      _id: new ObjectId(),
      userId: new ObjectId(OWNER),
      title: "Milk",
      priority: "normal",
      boardId: source._id,
      completed: false,
      createdAt: new Date(),
      completedAt: null,
      updatedAt: new Date(),
    };
    fakeDb.seed("tasks", [task]);
    await shareItem(OWNER, FRIEND, "task", task._id.toHexString());

    spy.mockClear();
    await removeBoard(OWNER, source._id.toHexString(), { action: "move", targetId: target._id.toHexString() });

    const notified = spy.mock.calls.map((c) => c[0]);
    expect(new Set(notified)).toEqual(new Set([OWNER, FRIEND]));
    spy.mockRestore();
  });
});
