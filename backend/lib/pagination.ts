// Lists show this many items per page.
export const PAGE_SIZE = 20;

/** Reads the ?page= query value. Anything that is not a whole number of 1 or more counts as page 1. */
export function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/**
 * The page that exists for this total. A page past the end is clamped to the last one, so a list that
 * shrank (a task was deleted on another device) still shows items.
 */
export function pageOf(total: number, requested: number): { page: number; pageCount: number; skip: number } {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, requested), pageCount);
  return { page, pageCount, skip: (page - 1) * PAGE_SIZE };
}
