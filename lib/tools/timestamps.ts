/** Unix timestamp conversion for the timestamp converter. Pure functions; the time zone is passed in so tests do not depend on the machine. */

export type TimeUnit = "auto" | "seconds" | "milliseconds";

/** A date and time can be held up to 8.64e15 milliseconds either side of 1 January 1970. */
export const MAX_MS = 8.64e15;

/** With "auto", a number of 100 billion or more is read as milliseconds (100 billion seconds is the year 5138). */
export function resolveUnit(value: number, unit: TimeUnit): "seconds" | "milliseconds" {
  if (unit !== "auto") return unit;
  return Math.abs(value) >= 1e11 ? "milliseconds" : "seconds";
}

export type ParsedTimestamp = { ok: true; ms: number; unit: "seconds" | "milliseconds" } | { ok: false; error: string };

export function parseTimestamp(text: string, unit: TimeUnit): ParsedTimestamp {
  const cleaned = text.trim().replace(/[,_\s]/g, "");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { ok: false, error: "Enter a timestamp as a number, such as 1700000000." };
  const value = Number(cleaned);
  const resolved = resolveUnit(value, unit);
  const ms = Math.round(resolved === "seconds" ? value * 1000 : value);
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) return { ok: false, error: "That is outside the dates a browser can show (roughly the year 275760 either way)." };
  return { ok: true, ms, unit: resolved };
}

/** A date and time in a time zone, such as "31 Oct 2026, 17:02:30 IST". */
export function formatInZone(ms: number, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "long", timeZone, hourCycle: "h23" }).format(new Date(ms));
}

export const toIso = (ms: number): string => new Date(ms).toISOString();

const UNITS: [name: string, ms: number][] = [
  ["year", 365.25 * 86_400_000],
  ["month", 30.4375 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1000],
];
/** "3 days ago" or "in 2 hours", using the biggest unit that fits. */
export function relativeTime(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  if (abs < 1000) return "now";
  const [name, size] = UNITS.find(([, s]) => abs >= s)!;
  const n = Math.floor(abs / size);
  const label = `${n} ${name}${n === 1 ? "" : "s"}`;
  return diff < 0 ? `${label} ago` : `in ${label}`;
}

export type ParsedDateInput = { ok: true; ms: number } | { ok: false; error: string };

/** Read a "YYYY-MM-DDTHH:mm[:ss]" value, as a date-time field gives, either as UTC or in the time zone of this device. */
export function parseDateTime(value: string, as: "utc" | "local"): ParsedDateInput {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return { ok: false, error: "Choose a date and time." };
  const [y, mo, d, h, mi, s] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0)];
  const date = as === "utc" ? new Date(Date.UTC(y, mo - 1, d, h, mi, s)) : new Date(y, mo - 1, d, h, mi, s);
  // new Date rolls 31 April over to 1 May; refuse that instead of quietly changing the date.
  const roundTrip = as === "utc" ? [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()] : [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  if (roundTrip[0] !== y || roundTrip[1] !== mo || roundTrip[2] !== d) return { ok: false, error: "That date does not exist." };
  const ms = date.getTime();
  return Number.isNaN(ms) ? { ok: false, error: "That date does not exist." } : { ok: true, ms };
}
