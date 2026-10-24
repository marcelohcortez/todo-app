import { describe, expect, it } from "vitest";
import { escapeRegex, MIN_SEARCH, searchQuery } from "./search";

describe("searchQuery", () => {
  it("searches from the third character", () => {
    expect(MIN_SEARCH).toBe(3);
    expect(searchQuery("ab")).toBeUndefined();
    expect(searchQuery("abc")).toBe("abc");
  });

  it("ignores missing or blank text", () => {
    expect(searchQuery(null)).toBeUndefined();
    expect(searchQuery("   ")).toBeUndefined();
  });

  it("trims the text and cuts it to 200 characters", () => {
    expect(searchQuery("  milk  ")).toBe("milk");
    expect(searchQuery("x".repeat(250))).toHaveLength(200);
  });
});

describe("escapeRegex", () => {
  it("escapes characters that have a meaning in a regular expression", () => {
    expect(escapeRegex("a+b(c)[d]*")).toBe("a\\+b\\(c\\)\\[d\\]\\*");
    expect(new RegExp(escapeRegex("1.5")).test("1x5")).toBe(false);
    expect(new RegExp(escapeRegex("1.5")).test("1.5")).toBe(true);
  });
});
