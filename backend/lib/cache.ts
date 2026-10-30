export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  delete(key: string): void;
}

/** A per-key cache where each entry expires `ttlMs` after it was set, independently of the others. */
export function createTtlCache<V>(ttlMs: number): TtlCache<V> {
  const entries = new Map<string, { value: V; expiresAt: number }>();
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key) {
      entries.delete(key);
    },
  };
}
