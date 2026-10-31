/**
 * Date maths for the age and days-between calculators. Everything works on whole calendar dates (year, month, day), never on
 * clock times, so time zones and daylight saving cannot move a result. Day counts go through UTC day numbers, which are exact.
 */

export interface YMD {
  y: number;
  m: number; // 1 to 12
  d: number; // 1 to 31
}

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2200;

export const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (y: number, m: number): number => [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;

/** "2026-10-31" to a date, or undefined when it is not a real calendar date in the supported range. */
export function parseDate(text: string): YMD | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return undefined;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (y < MIN_YEAR || y > MAX_YEAR || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return undefined;
  return { y, m, d };
}

export const formatIso = ({ y, m, d }: YMD): string => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Whole days since 1970-01-01, exact for any date. */
export const dayNumber = ({ y, m, d }: YMD): number => Math.round(Date.UTC(y, m - 1, d) / 86_400_000);

/** The date `days` after `date` (or before, when negative). */
export function addDays(date: YMD, days: number): YMD {
  const t = new Date((dayNumber(date) + days) * 86_400_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export const compareDates = (a: YMD, b: YMD): number => dayNumber(a) - dayNumber(b);
export const daysBetween = (from: YMD, to: YMD): number => dayNumber(to) - dayNumber(from);

/** Move a date forward by whole months. A day that does not exist in the target month (31 January + 1 month) becomes its last day. */
export function addMonths(date: YMD, months: number): YMD {
  const index = date.y * 12 + (date.m - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

export interface Span {
  years: number;
  months: number;
  days: number;
}

/**
 * Years, months and days from `from` to `to` (`from` must not be after `to`): the most whole months that fit, then the days left.
 * Month ends are clamped, so 31 January to 1 March (a common year) is 1 month and 1 day.
 */
export function spanBetween(from: YMD, to: YMD): Span {
  let months = (to.y - from.y) * 12 + (to.m - from.m);
  if (compareDates(addMonths(from, months), to) > 0) months -= 1;
  const anchor = addMonths(from, months);
  return { years: Math.floor(months / 12), months: months % 12, days: daysBetween(anchor, to) };
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekdayOf = (date: YMD): string => WEEKDAYS[new Date(dayNumber(date) * 86_400_000).getUTCDay()]!;

// Age

export interface AgeResult {
  span: Span;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
  bornOn: string;
  nextBirthday: YMD;
  daysToBirthday: number;
  /** The age the person turns on the next birthday. */
  turning: number;
}

/**
 * The next birthday on or after `asOf`. Someone born on 29 February has their birthday on 28 February in years that are not
 * leap years; some places count 1 March instead, so the page says which one is used.
 */
export function nextBirthday(born: YMD, asOf: YMD): YMD {
  const on = (y: number): YMD => ({ y, m: born.m, d: Math.min(born.d, daysInMonth(y, born.m)) });
  const thisYear = on(asOf.y);
  return compareDates(thisYear, asOf) >= 0 ? thisYear : on(asOf.y + 1);
}

export function calculateAge(born: YMD, asOf: YMD): AgeResult {
  const span = spanBetween(born, asOf);
  const next = nextBirthday(born, asOf);
  const totalDays = daysBetween(born, asOf);
  return {
    span,
    totalMonths: span.years * 12 + span.months,
    totalWeeks: Math.floor(totalDays / 7),
    totalDays,
    bornOn: weekdayOf(born),
    nextBirthday: next,
    daysToBirthday: daysBetween(asOf, next),
    turning: next.y - born.y,
  };
}

export interface AgeRaw extends Record<string, string> {
  born: string;
  asOf: string;
}
export function evaluateAge(raw: AgeRaw): { errors: Partial<Record<keyof AgeRaw, string>>; result?: AgeResult } {
  const errors: Partial<Record<keyof AgeRaw, string>> = {};
  const born = raw.born.trim() === "" ? undefined : parseDate(raw.born);
  const asOf = raw.asOf.trim() === "" ? undefined : parseDate(raw.asOf);
  if (raw.born.trim() !== "" && !born) errors.born = `Enter a real date of birth between ${MIN_YEAR} and ${MAX_YEAR}.`;
  if (raw.asOf.trim() !== "" && !asOf) errors.asOf = `Enter a real date between ${MIN_YEAR} and ${MAX_YEAR}.`;
  if (!born || !asOf) return { errors };
  if (compareDates(born, asOf) > 0) return { errors: { born: "The date of birth cannot be after the date you are measuring to." } };
  return { errors, result: calculateAge(born, asOf) };
}

// Days between

export interface DaysResult {
  /** The dates in the order they were counted, earliest first. */
  from: YMD;
  to: YMD;
  swapped: boolean;
  totalDays: number;
  weeks: number;
  extraDays: number;
  span: Span;
}

/** Days from the earlier date to the later one. With `includeEnd` the later day is counted too, which adds one. */
export function calculateDays(a: YMD, b: YMD, includeEnd: boolean): DaysResult {
  const swapped = compareDates(a, b) > 0;
  const [from, to] = swapped ? [b, a] : [a, b];
  const end = includeEnd ? addDays(to, 1) : to;
  const totalDays = daysBetween(from, end);
  return { from, to, swapped, totalDays, weeks: Math.floor(totalDays / 7), extraDays: totalDays % 7, span: spanBetween(from, end) };
}

export interface DaysRaw extends Record<string, string> {
  start: string;
  end: string;
}
export function evaluateDays(raw: DaysRaw, includeEnd: boolean): { errors: Partial<Record<keyof DaysRaw, string>>; result?: DaysResult } {
  const errors: Partial<Record<keyof DaysRaw, string>> = {};
  const start = raw.start.trim() === "" ? undefined : parseDate(raw.start);
  const end = raw.end.trim() === "" ? undefined : parseDate(raw.end);
  if (raw.start.trim() !== "" && !start) errors.start = `Enter a real date between ${MIN_YEAR} and ${MAX_YEAR}.`;
  if (raw.end.trim() !== "" && !end) errors.end = `Enter a real date between ${MIN_YEAR} and ${MAX_YEAR}.`;
  if (!start || !end) return { errors };
  return { errors, result: calculateDays(start, end, includeEnd) };
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "15 May 2027". */
export const formatLong = ({ y, m, d }: YMD): string => `${d} ${MONTH_NAMES[m - 1]} ${y}`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** "36 years, 5 months, 16 days", leaving out nothing so the three parts always show. */
export const describeSpan = (s: Span): string => `${plural(s.years, "year")}, ${plural(s.months, "month")}, ${plural(s.days, "day")}`;
/** Today's date in the visitor's own time zone, as "YYYY-MM-DD". */
export function todayIso(now = new Date()): string {
  return formatIso({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}
