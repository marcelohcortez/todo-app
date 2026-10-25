import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { acceptFriendRequest, areFriends, listFriendState, removeFriendship, requestFriend } from "./friends";
import { unreadCount } from "./notifications";
import { shareItem } from "./shares";

const ALICE = new ObjectId().toHexString();
const BOB = new ObjectId().toHexString();
const ALICE_EMAIL = "alice@example.com";
const BOB_EMAIL = "bob@example.com";

function seedUsers() {
  fakeDb.seed("users", [
    { _id: new ObjectId(ALICE), email: ALICE_EMAIL },
    { _id: new ObjectId(BOB), email: BOB_EMAIL },
  ]);
}

beforeEach(async () => {
  for (const name of ["users", "friendships", "notifications", "shares", "boards", "tasks", "notes"]) {
    await fakeDb.collection(name).deleteMany({});
  }
  seedUsers();
});

describe("requestFriend", () => {
  it("creates a pending request and notifies the recipient", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    const state = await listFriendState(BOB);
    expect(state.incoming).toHaveLength(1);
    expect(state.incoming[0].userId).toBe(ALICE);
    expect(await unreadCount(BOB)).toBe(1);
  });

  it("auto-accepts when the other person already sent a pending request", async () => {
    await requestFriend(ALICE, BOB_EMAIL); // Alice -> Bob, pending
    await requestFriend(BOB, ALICE_EMAIL); // Bob -> Alice: both want it now

    expect(await areFriends(ALICE, BOB)).toBe(true);
    const aliceState = await listFriendState(ALICE);
    expect(aliceState.friends).toHaveLength(1);
    expect(aliceState.incoming).toHaveLength(0);
    expect(aliceState.outgoing).toHaveLength(0);
  });

  it("does not duplicate an existing pending request from the same side", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    await requestFriend(ALICE, BOB_EMAIL);
    const state = await listFriendState(BOB);
    expect(state.incoming).toHaveLength(1);
  });

  it("no-ops when already friends", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    await requestFriend(BOB, ALICE_EMAIL);
    await requestFriend(ALICE, BOB_EMAIL);
    const state = await listFriendState(ALICE);
    expect(state.friends).toHaveLength(1);
  });

  it("silently does nothing when the email has no account", async () => {
    await requestFriend(ALICE, "nobody@example.com");
    const state = await listFriendState(ALICE);
    expect(state.outgoing).toHaveLength(0);
  });

  it("silently does nothing when the email is the caller's own", async () => {
    await requestFriend(ALICE, ALICE_EMAIL);
    const state = await listFriendState(ALICE);
    expect(state.outgoing).toHaveLength(0);
    expect(state.friends).toHaveLength(0);
  });
});

describe("acceptFriendRequest", () => {
  it("accepts a pending request addressed to the caller", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    const { incoming } = await listFriendState(BOB);
    const result = await acceptFriendRequest(BOB, incoming[0].friendshipId);
    expect(result).toBe("ok");
    expect(await areFriends(ALICE, BOB)).toBe(true);
  });

  it("returns not_found when the caller is not the recipient", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    const { outgoing } = await listFriendState(ALICE);
    expect(await acceptFriendRequest(ALICE, outgoing[0].friendshipId)).toBe("not_found");
  });

  it("returns not_found for an unknown id", async () => {
    expect(await acceptFriendRequest(BOB, new ObjectId().toHexString())).toBe("not_found");
  });
});

describe("removeFriendship", () => {
  it("lets either side cancel or decline a pending request", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    const { incoming } = await listFriendState(BOB);
    expect(await removeFriendship(BOB, incoming[0].friendshipId)).toBe("ok");
    expect(await listFriendState(ALICE)).toMatchObject({ outgoing: [], friends: [] });
  });

  it("ends an accepted friendship and removes shares between the two people", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    await requestFriend(BOB, ALICE_EMAIL);
    const board = { _id: new ObjectId(), userId: new ObjectId(ALICE), name: "Groceries", createdAt: new Date() };
    fakeDb.seed("boards", [board]);
    await shareItem(ALICE, BOB, "board", board._id.toHexString());

    const { friends } = await listFriendState(ALICE);
    expect(await removeFriendship(ALICE, friends[0].friendshipId)).toBe("ok");
    expect(await areFriends(ALICE, BOB)).toBe(false);

    const { resolveBoardViewAccess } = await import("./shares");
    expect(await resolveBoardViewAccess(BOB, board._id.toHexString())).toBeNull();
  });

  it("returns not_found when the caller is not a party to the friendship", async () => {
    await requestFriend(ALICE, BOB_EMAIL);
    const other = new ObjectId().toHexString();
    const { incoming } = await listFriendState(BOB);
    expect(await removeFriendship(other, incoming[0].friendshipId)).toBe("not_found");
  });
});
