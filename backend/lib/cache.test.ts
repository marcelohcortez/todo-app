import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTtlCache } from "./cache";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createTtlCache", () => {
  it("returns a set value before it expires", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("a", "value");
    expect(cache.get("a")).toBe("value");
  });

  it("returns undefined for a key that was never set", () => {
    const cache = createTtlCache<string>(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("expires a value once its ttl has passed", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("a", "value");
    vi.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();
  });

  it("deletes a value on request", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("a", "value");
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });

  it("keeps keys independent", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
  });
});
