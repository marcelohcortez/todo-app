import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { cleanBody, toNote } from "./notes";

describe("cleanBody", () => {
  it("trims the note text", () => {
    expect(cleanBody("  hello  ")).toBe("hello");
  });

  it("rejects empty, blank, non-string and over-long notes", () => {
    expect(cleanBody("")).toBeNull();
    expect(cleanBody(" \n\t ")).toBeNull();
    expect(cleanBody(7)).toBeNull();
    expect(cleanBody(null)).toBeNull();
    expect(cleanBody("x".repeat(20001))).toBeNull();
  });

  it("accepts a note of exactly 20000 characters", () => {
    expect(cleanBody("x".repeat(20000))).toHaveLength(20000);
  });
});

describe("toNote", () => {
  it("maps the document to the API shape without the owner", () => {
    const id = new ObjectId();
    const note = toNote({
      _id: id,
      userId: new ObjectId(),
      body: "Remember the milk",
      createdAt: new Date("2026-03-01T08:00:00.000Z"),
      updatedAt: new Date("2026-03-02T08:00:00.000Z"),
    });
    expect(note).toEqual({
      id: id.toHexString(),
      body: "Remember the milk",
      createdAt: "2026-03-01T08:00:00.000Z",
      updatedAt: "2026-03-02T08:00:00.000Z",
    });
    expect(note).not.toHaveProperty("userId");
  });
});
