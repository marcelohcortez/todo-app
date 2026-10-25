import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { requestFriend } from "./friends";
import {
  notifyAccess,
  resolveBoardViewAccess,
  resolveNoteAccess,
  resolveTaskAccess,
  shareItem,
  unshareItem,
} from "./shares";

const OWNER = new ObjectId().toHexString();
const FRIEND = new ObjectId().toHexString();
const STRANGER = new ObjectId().toHexString();

async function seedFriendship() {
  fakeDb.seed("users", [
    { _id: new ObjectId(OWNER), email: "owner@example.com" },
    { _id: new ObjectId(FRIEND), email: "friend@example.com" },
  ]);
  await requestFriend(OWNER, "friend@example.com");
  await requestFriend(FRIEND, "owner@example.com");
}

beforeEach(async () => {
  for (const name of ["users", "friendships", "notifications", "shares", "boards", "tasks", "notes"]) {
    await fakeDb.collection(name).deleteMany({});
  }
  await seedFriendship();
});

describe("shareItem", () => {
  it("rejects sharing an item the caller does not own", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(STRANGER), name: "Not mine", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    expect(await shareItem(OWNER, FRIEND, "board", board._id.toHexString())).toBe("not_found");
  });

  it("rejects sharing with someone who is not a friend", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    expect(await shareItem(OWNER, STRANGER, "board", board._id.toHexString())).toBe("not_friends");
  });

  it("shares a board the caller owns with a friend", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    expect(await shareItem(OWNER, FRIEND, "board", board._id.toHexString())).toBe("ok");
    expect(await resolveBoardViewAccess(FRIEND, board._id.toHexString())).toEqual({ ownerId: OWNER });
  });

  it("is safe to call twice", async () => {
    const note = { _id: new ObjectId(), userId: new ObjectId(OWNER), body: "hi", createdAt: new Date(), updatedAt: new Date() };
    fakeDb.seed("notes", [note]);
    await shareItem(OWNER, FRIEND, "note", note._id.toHexString());
    await shareItem(OWNER, FRIEND, "note", note._id.toHexString());
    const shares = await fakeDb.collection("shares").find({}).toArray();
    expect(shares).toHaveLength(1);
  });
});

describe("access resolution", () => {
  it("resolves the owner to themself", async () => {
    const note = { _id: new ObjectId(), userId: new ObjectId(OWNER), body: "hi", createdAt: new Date(), updatedAt: new Date() };
    fakeDb.seed("notes", [note]);
    expect(await resolveNoteAccess(OWNER, note._id.toHexString())).toEqual({ ownerId: OWNER });
  });

  it("resolves a task through its own direct share", async () => {
    const task = { _id: new ObjectId(), userId: new ObjectId(OWNER), title: "x", priority: "normal", boardId: null, completed: false, createdAt: new Date(), completedAt: null, updatedAt: new Date() };
    fakeDb.seed("tasks", [task]);
    await shareItem(OWNER, FRIEND, "task", task._id.toHexString());
    expect(await resolveTaskAccess(FRIEND, task._id.toHexString())).toEqual({ ownerId: OWNER });
  });

  it("resolves a task through a share on its board", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    const task = { _id: new ObjectId(), userId: new ObjectId(OWNER), title: "Milk", priority: "normal", boardId: board._id, completed: false, createdAt: new Date(), completedAt: null, updatedAt: new Date() };
    fakeDb.seed("tasks", [task]);
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());
    expect(await resolveTaskAccess(FRIEND, task._id.toHexString())).toEqual({ ownerId: OWNER });
  });

  it("returns null when there is no access at all", async () => {
    const note = { _id: new ObjectId(), userId: new ObjectId(OWNER), body: "hi", createdAt: new Date(), updatedAt: new Date() };
    fakeDb.seed("notes", [note]);
    expect(await resolveNoteAccess(STRANGER, note._id.toHexString())).toBeNull();
    expect(await resolveNoteAccess(FRIEND, note._id.toHexString())).toBeNull();
  });

  it("returns null for a non-existent item", async () => {
    expect(await resolveTaskAccess(OWNER, new ObjectId().toHexString())).toBeNull();
  });
});

describe("unshareItem", () => {
  it("lets the owner revoke a share", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());
    const [share] = await fakeDb.collection("shares").find({}).toArray();
    expect(await unshareItem(OWNER, (share as { _id: ObjectId })._id.toHexString())).toBe(true);
    expect(await resolveBoardViewAccess(FRIEND, board._id.toHexString())).toBeNull();
  });

  it("lets the friend leave a share", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());
    const [share] = await fakeDb.collection("shares").find({}).toArray();
    expect(await unshareItem(FRIEND, (share as { _id: ObjectId })._id.toHexString())).toBe(true);
  });

  it("refuses someone with no standing on the share", async () => {
    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());
    const [share] = await fakeDb.collection("shares").find({}).toArray();
    expect(await unshareItem(STRANGER, (share as { _id: ObjectId })._id.toHexString())).toBe(false);
  });
});

describe("notifyAccess", () => {
  it("pings the owner and every friend with access, without duplicates", async () => {
    const realtime = await import("./realtime");
    const spy = vi.spyOn(realtime, "notifyChanged").mockResolvedValue();

    const board = { _id: new ObjectId(), userId: new ObjectId(OWNER), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    const task = { _id: new ObjectId(), userId: new ObjectId(OWNER), title: "Milk", priority: "normal", boardId: board._id, completed: false, createdAt: new Date(), completedAt: null, updatedAt: new Date() };
    fakeDb.seed("tasks", [task]);
    await shareItem(OWNER, FRIEND, "board", board._id.toHexString());

    await notifyAccess(OWNER, { boardId: board._id.toHexString(), taskId: task._id.toHexString() });

    const notified = spy.mock.calls.map((c) => c[0]);
    expect(new Set(notified)).toEqual(new Set([OWNER, FRIEND]));
    spy.mockRestore();
  });
});
