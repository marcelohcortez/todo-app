import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the rateLimits collection: findOneAndUpdate adds to the count of one _id.
const counts = new Map<string, number>();

vi.mock("./mongodb", () => ({
  getDb: async () => ({
    collection: () => ({
      createIndex: async () => "",
      findOneAndUpdate: async (filter: { _id: string }, update: { $inc: { count: number } }) => {
        const count = (counts.get(filter._id) ?? 0) + update.$inc.count;
        counts.set(filter._id, count);
        return { _id: filter._id, count };
      },
    }),
  }),
}));

import { takeAttempt } from "./rateLimit";

describe("takeAttempt", () => {
  beforeEach(() => counts.clear());

  it("allows attempts up to the maximum, then refuses", async () => {
    expect((await takeAttempt("test:a", 2, 900)).allowed).toBe(true);
    expect((await takeAttempt("test:a", 2, 900)).allowed).toBe(true);
    const third = await takeAttempt("test:a", 2, 900);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
    expect(third.retryAfterSeconds).toBeLessThanOrEqual(900);
  });

  it("counts each key separately", async () => {
    await takeAttempt("test:a", 1, 900);
    expect((await takeAttempt("test:a", 1, 900)).allowed).toBe(false);
    expect((await takeAttempt("test:b", 1, 900)).allowed).toBe(true);
  });
});
