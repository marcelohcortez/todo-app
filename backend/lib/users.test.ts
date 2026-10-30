import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { currentUser } from "./users";

function seedUser(email: string) {
  const id = new ObjectId();
  fakeDb.seed("users", [{ _id: id, email, passwordHash: "x", createdAt: new Date() }]);
  return id.toHexString();
}

beforeEach(async () => {
  await fakeDb.collection("users").deleteMany({});
});

describe("currentUser", () => {
  it("returns the user's email and isAdmin status", async () => {
    const id = seedUser("person@example.com");
    expect(await currentUser(id)).toEqual({ email: "person@example.com", isAdmin: false });
  });

  it("returns null for a user that doesn't exist", async () => {
    expect(await currentUser(new ObjectId().toHexString())).toBeNull();
  });

  it("caches the lookup: still answers correctly once the underlying doc is gone", async () => {
    const id = seedUser("cached@example.com");
    const first = await currentUser(id);
    expect(first?.email).toBe("cached@example.com");

    // Remove the doc directly, bypassing users.ts, to prove the second call was served from cache
    // rather than hitting the (now empty) collection.
    await fakeDb.collection("users").deleteOne({ _id: new ObjectId(id) });
    const second = await currentUser(id);
    expect(second?.email).toBe("cached@example.com");
  });
});
