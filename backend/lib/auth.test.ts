import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { allowedSecrets } from "./auth";
import * as jose from "jose";

describe("auth", () => {
  const originalSecret = process.env.AUTH_SECRET;
  const originalKeyId = process.env.AUTH_SECRET_KEY_ID;
  const originalPrev = process.env.AUTH_SECRET_PREV;

  beforeEach(() => {
    process.env.AUTH_SECRET = "0123456789012345678901234567890123456789"; // 40 chars
    process.env.AUTH_SECRET_KEY_ID = "v1";
    delete process.env.AUTH_SECRET_PREV;
  });

  afterAll(() => {
    process.env.AUTH_SECRET = originalSecret;
    process.env.AUTH_SECRET_KEY_ID = originalKeyId;
    process.env.AUTH_SECRET_PREV = originalPrev;
  });

  describe("allowedSecrets", () => {
    it("returns only the current key when AUTH_SECRET_PREV is not set", () => {
      const secrets = allowedSecrets();
      expect(secrets).toHaveLength(1);
      expect(secrets[0].id).toBe("v1");
    });

    it("returns current + previous when AUTH_SECRET_PREV is set", () => {
      process.env.AUTH_SECRET_PREV = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPrev";
      const secrets = allowedSecrets();
      expect(secrets).toHaveLength(2);
      expect(secrets.map((s: { id: string }) => s.id)).toEqual(["v1", "prev"]);
    });

    it("ignores AUTH_SECRET_PREV if it is too short", () => {
      process.env.AUTH_SECRET_PREV = "short";
      const secrets = allowedSecrets();
      expect(secrets).toHaveLength(1);
    });
  });

  describe("JWT creation", () => {
    it("creates and verifies a token with the current key", async () => {
      const token = await new jose.SignJWT({})
        .setProtectedHeader({ alg: "HS256", kid: "v1" })
        .setSubject("user-99")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

      const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      expect(payload.sub).toBe("user-99");
      expect(payload.iat).toBeDefined();
    });

    it("rejects a token signed with a different key", async () => {
      const wrongKey = new TextEncoder().encode("differentkeythatdoesntmatch0123456789");
      const token = await new jose.SignJWT({})
        .setProtectedHeader({ alg: "HS256", kid: "v1" })
        .setSubject("user-99")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(wrongKey);

      await expect(jose.jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET))).rejects.toThrow();
    });
  });
});
