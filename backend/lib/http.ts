// Comfortably above the largest legitimate payload (a note body capped at 20000 chars), so this
// only ever rejects a request meant to make the server buffer and parse an oversized body.
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Reads and parses a request body as JSON, rejecting it (without buffering the rest) once more
 * than MAX_BODY_BYTES has arrived. A Content-Length over the limit is rejected up front; the byte
 * count is also checked as the body streams in, since Content-Length can be absent or wrong.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches req.json()'s own (any) return type
export async function readJsonBody(req: Request): Promise<any> {
  const length = req.headers.get("content-length");
  if (length && Number(length) > MAX_BODY_BYTES) throw new Error("Request body too large");
  if (!req.body) return req.json();

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("Request body too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
