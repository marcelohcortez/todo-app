import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { cleanTitle, isPriority, isStatusFilter, toTask } from "./tasks";
import type { TaskDoc } from "./types";

describe("cleanTitle", () => {
  it("trims the title", () => {
    expect(cleanTitle("  Buy milk  ")).toBe("Buy milk");
  });

  it("rejects empty, blank, non-string and over-long titles", () => {
    expect(cleanTitle("")).toBeNull();
    expect(cleanTitle("   ")).toBeNull();
    expect(cleanTitle(42)).toBeNull();
    expect(cleanTitle(undefined)).toBeNull();
    expect(cleanTitle("x".repeat(501))).toBeNull();
  });

  it("accepts a title of exactly 500 characters", () => {
    expect(cleanTitle("x".repeat(500))).toHaveLength(500);
  });
});

describe("isPriority", () => {
  it("accepts the three priorities only", () => {
    expect(isPriority("high")).toBe(true);
    expect(isPriority("medium")).toBe(true);
    expect(isPriority("normal")).toBe(true);
    expect(isPriority("urgent")).toBe(false);
    expect(isPriority(null)).toBe(false);
  });
});

describe("isStatusFilter", () => {
  it("accepts active, done and all", () => {
    expect(isStatusFilter("active")).toBe(true);
    expect(isStatusFilter("done")).toBe(true);
    expect(isStatusFilter("all")).toBe(true);
    expect(isStatusFilter("archived")).toBe(false);
  });
});

describe("toTask", () => {
  const boardId = new ObjectId();
  const doc: TaskDoc = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    title: "Write tests",
    priority: "high",
    boardId,
    completed: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    completedAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  it("returns ids as strings and dates as ISO strings, and never the owner", () => {
    const task = toTask(doc);
    expect(task).toEqual({
      id: doc._id.toHexString(),
      title: "Write tests",
      priority: "high",
      boardId: boardId.toHexString(),
      completed: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(task).not.toHaveProperty("userId");
  });

  it("maps a task without a board to a null boardId", () => {
    expect(toTask({ ...doc, boardId: null }).boardId).toBeNull();
    expect(toTask({ ...doc, boardId: undefined }).boardId).toBeNull();
  });

  it("maps a task that is not completed to a null completedAt", () => {
    expect(toTask({ ...doc, completed: false, completedAt: null }).completedAt).toBeNull();
  });
});
