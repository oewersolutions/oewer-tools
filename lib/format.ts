/** "2026-10-29T08:30:00Z" -> "29 October 2026" (always UTC, so builds are reproducible). */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Whole minutes to read a text at an average pace; never less than 1. */
export function readingMinutes(text: string, wordsPerMinute = 200): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
