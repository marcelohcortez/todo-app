import { describe, expect, it } from "vitest";
import { generateMcpToken, hashToken } from "./mcp";

describe("generateMcpToken", () => {
  it("creates a prefixed token with 32 random bytes in hex", () => {
    expect(generateMcpToken()).toMatch(/^tdk_[0-9a-f]{64}$/);
  });

  it("creates a different token each time", () => {
    expect(generateMcpToken()).not.toBe(generateMcpToken());
  });
});

describe("hashToken", () => {
  it("is a stable SHA-256 hex digest, so the plain token never needs to be stored", () => {
    const hash = hashToken("tdk_example");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("tdk_example")).toBe(hash);
    expect(hashToken("tdk_other")).not.toBe(hash);
  });
});
