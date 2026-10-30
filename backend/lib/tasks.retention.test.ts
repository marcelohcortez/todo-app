import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Records the filters the task collection is queried with.
const calls = vi.hoisted(() => ({ find: [] as unknown[], deleteMany: [] as unknown[] }));

vi.mock("./mongodb", () => ({
  getDb: async () => ({
    collection: () => ({
      find: (filter: unknown) => {
        calls.find.push(filter);
        return { toArray: async () => [] };
      },
      deleteMany: async (filter: unknown) => {
        calls.deleteMany.push(filter);
        return { deletedCount: 0 };
      },
      createIndex: async () => "ok",
    }),
  }),
}));

import { DONE_RETENTION_DAYS, listTasks, purgeExpiredDoneTasks } from "./tasks";

const USER = new ObjectId().toHexString();

describe("completed tasks are kept for 30 days", () => {
  beforeEach(() => {
    calls.find.length = 0;
    calls.deleteMany.length = 0;
  });

  it("keeps the retention period at 30 days", () => {
    expect(DONE_RETENTION_DAYS).toBe(30);
  });

  it("deletes this user's tasks completed more than 30 days ago", async () => {
    await purgeExpiredDoneTasks(USER);
    const filter = calls.deleteMany[0] as Record<string, unknown>;
    expect(filter.completed).toBe(true);
    expect(filter.userId).toEqual(new ObjectId(USER));
    const cutoff = (filter.$or as { completedAt?: { $lt: Date } }[])[0].completedAt!.$lt;
    expect(Date.now() - cutoff.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
  });

  it("deletes across all users when no user is given", async () => {
    await purgeExpiredDoneTasks();
    expect(calls.deleteMany[0]).not.toHaveProperty("userId");
  });

  it("lists only the completed tasks from the last 30 days, and purges the user's old ones first", async () => {
    await listTasks(USER, "done");
    expect(calls.deleteMany).toHaveLength(1);
    const filter = calls.find[0] as Record<string, unknown>;
    expect(filter.completed).toBe(true);
    const since = (filter.$or as { completedAt?: { $gte: Date } }[])[0].completedAt!.$gte;
    expect(Date.now() - since.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
  });
});
