import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageOf, parsePage } from "./pagination";

describe("parsePage", () => {
  it("reads whole numbers of 1 or more", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("2.7")).toBe(2);
  });

  it("treats anything else as page 1", () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
});

describe("pageOf", () => {
  it("shows 20 items per page", () => {
    expect(PAGE_SIZE).toBe(20);
  });

  it("has one page when there are no items, and skips nothing", () => {
    expect(pageOf(0, 1)).toEqual({ page: 1, pageCount: 1, skip: 0 });
  });

  it("counts the pages and the skip for the requested page", () => {
    expect(pageOf(20, 1)).toEqual({ page: 1, pageCount: 1, skip: 0 });
    expect(pageOf(21, 2)).toEqual({ page: 2, pageCount: 2, skip: 20 });
    expect(pageOf(45, 3)).toEqual({ page: 3, pageCount: 3, skip: 40 });
  });

  it("clamps a page past the end to the last page", () => {
    expect(pageOf(21, 9)).toEqual({ page: 2, pageCount: 2, skip: 20 });
  });
});
