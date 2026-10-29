/** "2026-10-29T08:30:00Z" -> "29 October 2026" (always UTC, so builds are reproducible). */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
