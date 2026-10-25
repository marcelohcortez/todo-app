// Calls the JSON API. Throws (with the server's error message, when it sent one) on a non-OK response.
export async function api(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

// Calls the JSON API without throwing, returning the status code alongside the body. For callers
// that need to react to the status itself (for example, telling a rate limit apart from success).
export async function apiRaw(
  url: string,
  init: RequestInit = {}
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
