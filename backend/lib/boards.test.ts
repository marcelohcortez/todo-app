import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { cleanBoardName, toBoard } from "./boards";

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
