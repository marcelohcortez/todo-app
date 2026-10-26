import { describe, expect, it } from "vitest";
import { readJsonBody } from "./http";

function fakeRequest(opts: { headers?: Record<string, string>; chunks?: string[] }): Request {
  const headers = new Headers(opts.headers ?? {});
  const chunks = (opts.chunks ?? []).map((c) => new TextEncoder().encode(c));
  const body = chunks.length
    ? new ReadableStream<Uint8Array>({
        start(controller) {
          chunks.forEach((c) => controller.enqueue(c));
          controller.close();
        },
      })
    : null;
  return {
    headers,
    body,
    json: async () => JSON.parse(chunks.map((c) => new TextDecoder().decode(c)).join("")),
  } as unknown as Request;
}

describe("readJsonBody", () => {
  it("parses a normal JSON body streamed in chunks", async () => {
    const req = fakeRequest({ chunks: ['{"a":', "1}"] });
    await expect(readJsonBody(req)).resolves.toEqual({ a: 1 });
  });

  it("rejects up front when Content-Length exceeds the limit", async () => {
    const req = fakeRequest({ headers: { "content-length": String(1024 * 1024) }, chunks: ["{}"] });
    await expect(readJsonBody(req)).rejects.toThrow("too large");
  });

  it("rejects once the streamed body exceeds the limit, even with no Content-Length header", async () => {
    const big = "x".repeat(300 * 1024);
    const req = fakeRequest({ chunks: [big] });
    await expect(readJsonBody(req)).rejects.toThrow("too large");
  });

  it("falls back to req.json() when there is no body stream", async () => {
    const req = { headers: new Headers(), body: null, json: async () => ({ ok: true }) } as unknown as Request;
    await expect(readJsonBody(req)).resolves.toEqual({ ok: true });
  });
});
