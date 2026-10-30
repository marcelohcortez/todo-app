import { describe, expect, it, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

// Records the filters the tasks collection is counted with. The boards collection returns `boards.ids`.
const calls = vi.hoisted(() => ({ counted: [] as unknown[] }));
const boards = vi.hoisted(() => ({ ids: [] as unknown[] }));

vi.mock("./mongodb", () => ({
  getDb: async () => ({
    collection: (name: string) =>
      name === "boards"
        ? {
            find: () => ({ toArray: async () => boards.ids.map((_id) => ({ _id })) }),
            createIndex: async () => "ok",
          }
        : {
            countDocuments: async (filter: unknown) => {
              calls.counted.push(filter);
              return 0;
            },
            aggregate: () => ({ toArray: async () => [] }),
            deleteMany: async () => ({ deletedCount: 0 }),
            createIndex: async () => "ok",
          },
  }),
}));

import { listTaskPage } from "./tasks";

const USER = new ObjectId().toHexString();
const BOARD = { board: "work" };

type Filter = { $and: { $or: Record<string, unknown>[] }[] };

describe("task search also matches board names", () => {
  beforeEach(() => {
    calls.counted.length = 0;
    boards.ids = [];
  });

  it("matches the title, or a task on a board whose name matches", async () => {
    boards.ids = [BOARD];
    await listTaskPage(USER, "active", undefined, 1, "work");
    const [titleMatch, boardMatch] = (calls.counted[0] as Filter).$and[0].$or;
    expect(titleMatch).toEqual({ title: { $regex: "work", $options: "i" } });
    expect(boardMatch).toEqual({ boardId: { $in: [BOARD] } });
  });

  it("matches only the title when no board name matches", async () => {
    await listTaskPage(USER, "active", undefined, 1, "milk");
    expect((calls.counted[0] as Filter).$and[0].$or).toEqual([{ title: { $regex: "milk", $options: "i" } }]);
  });

  it("keeps the search apart from the done window", async () => {
    await listTaskPage(USER, "done", undefined, 1, "milk");
    const filter = calls.counted[0] as Record<string, unknown> & Filter;
    expect(filter.completed).toBe(true);
    expect(filter.$or).toBeDefined();
    expect(filter.$and[0].$or).toBeDefined();
  });
});
