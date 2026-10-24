// Searching starts at this many characters. Shorter text is ignored and the full list is shown.
export const MIN_SEARCH = 3;
const MAX_SEARCH = 200;

/** The text to search for, trimmed and cut to 200 characters, or undefined when it is too short to search. */
export function searchQuery(value: string | null): string | undefined {
  const text = (value ?? "").trim().slice(0, MAX_SEARCH);
  return text.length >= MIN_SEARCH ? text : undefined;
}

/** The text as a regular expression source that matches it literally, so "a+b" finds "a+b". */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
