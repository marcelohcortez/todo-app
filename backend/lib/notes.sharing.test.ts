import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { requestFriend } from "./friends";
import { deleteNote, getNote, updateNote } from "./notes";
import { shareItem } from "./shares";

const OWNER = new ObjectId().toHexString();
const FRIEND = new ObjectId().toHexString();
const STRANGER = new ObjectId().toHexString();

function seedNote() {
  const note = { _id: new ObjectId(), userId: new ObjectId(OWNER), body: "Pick up dry cleaning", createdAt: new Date(), updatedAt: new Date() };
  fakeDb.seed("notes", [note]);
  return note;
}

beforeEach(async () => {
  for (const name of ["users", "friendships", "notifications", "shares", "notes", "note_deletions"]) {
    await fakeDb.collection(name).deleteMany({});
  }
  fakeDb.seed("users", [
    { _id: new ObjectId(OWNER), email: "owner@example.com" },
    { _id: new ObjectId(FRIEND), email: "friend@example.com" },
  ]);
  await requestFriend(OWNER, "friend@example.com");
  await requestFriend(FRIEND, "owner@example.com");
});

describe("getNote/updateNote/deleteNote with a friend acting on a shared note", () => {
  it("lets a friend with a share read and edit the note", async () => {
    const note = seedNote();
    await shareItem(OWNER, FRIEND, "note", note._id.toHexString());

    expect((await getNote(FRIEND, note._id.toHexString()))?.body).toBe("Pick up dry cleaning");
    const updated = await updateNote(FRIEND, note._id.toHexString(), "Pick up dry cleaning tomorrow");
    expect(updated?.body).toBe("Pick up dry cleaning tomorrow");
  });

  it("lets a friend with a share delete the note", async () => {
    const note = seedNote();
    await shareItem(OWNER, FRIEND, "note", note._id.toHexString());

    expect(await deleteNote(FRIEND, note._id.toHexString())).toBe(true);
    expect(await getNote(OWNER, note._id.toHexString())).toBeNull();
  });

  it("refuses someone with no access", async () => {
    const note = seedNote();
    expect(await getNote(STRANGER, note._id.toHexString())).toBeNull();
    expect(await updateNote(STRANGER, note._id.toHexString(), "nope")).toBeNull();
    expect(await deleteNote(STRANGER, note._id.toHexString())).toBe(false);
  });
});
