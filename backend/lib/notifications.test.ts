import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "./test-support/fakeDb";

const fakeDb = createFakeDb();
vi.mock("./mongodb", () => ({ getDb: async () => fakeDb }));

import { listRecentNotifications, markAllRead, pushNotification, unreadCount } from "./notifications";

const USER = new ObjectId().toHexString();

beforeEach(async () => {
  await fakeDb.collection("notifications").deleteMany({});
});

describe("notifications", () => {
  it("starts unread and counts toward unreadCount", async () => {
    await pushNotification(USER, "friend_request", { fromEmail: "a@example.com" });
    expect(await unreadCount(USER)).toBe(1);
    const [n] = await listRecentNotifications(USER);
    expect(n.read).toBe(false);
    expect(n.type).toBe("friend_request");
  });

  it("only counts the given user's notifications", async () => {
    await pushNotification(USER, "friend_request", {});
    await pushNotification(new ObjectId().toHexString(), "friend_request", {});
    expect(await unreadCount(USER)).toBe(1);
  });

  it("markAllRead clears the unread count", async () => {
    await pushNotification(USER, "friend_request", {});
    await pushNotification(USER, "share", { kind: "board" });
    await markAllRead(USER);
    expect(await unreadCount(USER)).toBe(0);
    const list = await listRecentNotifications(USER);
    expect(list.every((n) => n.read)).toBe(true);
  });

  it("lists newest first, limited", async () => {
    for (let i = 0; i < 3; i++) await pushNotification(USER, "friend_accepted", { fromEmail: String(i) });
    const list = await listRecentNotifications(USER, 2);
    expect(list).toHaveLength(2);
  });
});
