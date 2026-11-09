import { describe, expect, it } from "vitest";
import { evaluateDateCalc, type DateCalcRaw } from "../lib/tools/datecalc";
import { formatClock, formatClockShort, formatMinSec, formatSpan, readDuration } from "../lib/tools/duration";
import { evaluateHours, parseClock, type HoursRaw } from "../lib/tools/hours";
import { evaluatePace, pacePer, speedIn, type PaceRaw } from "../lib/tools/pace";
import { evaluateTime, type TimeRaw } from "../lib/tools/timecalc";

const text = (w: { formula: string[]; steps: string[] } | undefined) => [...(w?.formula ?? []), ...(w?.steps ?? [])].join("\n");

describe("duration helpers", () => {
  it("reads parts, treats empty as zero and rejects bad ones", () => {
    expect(readDuration({ h: "1", m: "30", s: "" }, { hours: "h", minutes: "m", seconds: "s" })).toEqual({ seconds: 5400 });
    expect(readDuration({ h: "", m: "", s: "" }, { hours: "h", minutes: "m", seconds: "s" })).toEqual({ empty: true });
    expect(readDuration({ h: "x", m: "" }, { hours: "h", minutes: "m" })).toMatchObject({ errors: { h: expect.stringMatching(/number/) } });
    expect(readDuration({ h: "1.5" }, { hours: "h" })).toEqual({ seconds: 5400 });
  });
  it("formats clocks and spans", () => {
    expect(formatClock(5130)).toBe("1:25:30");
    expect(formatClockShort(1650)).toBe("27:30");
    expect(formatMinSec(330)).toBe("5:30");
    expect(formatSpan(93_784)).toBe("1 day 2 h 3 min 4 s");
    expect(formatSpan(0)).toBe("0 s");
    expect(formatSpan(90.5)).toBe("1 min 30.5 s");
  });
});

const pace = (over: Partial<PaceRaw>) => evaluatePace({ solve: "pace", distance: "", distanceUnit: "km", hours: "", minutes: "", seconds: "", paceMinutes: "", paceSeconds: "", paceUnit: "km", ...over } as PaceRaw);

describe("pace calculator", () => {
  it("finds pace: 10 km in 55 minutes is 5:30 per km, 8:51 per mile, 10.91 km/h", () => {
    const { result } = pace({ distance: "10", minutes: "55" });
    expect(pacePer(result!.secPerMetre, "km")).toBe("5:30");
    expect(pacePer(result!.secPerMetre, "mi")).toBe("8:51");
    expect(speedIn(result!.secPerMetre, "km")).toBeCloseTo(10.909, 3);
    expect(result!.races.map((r) => r.time)).toEqual(["27:30", "55:00", "1:56:02", "3:52:04"]);
    expect(text(result!.workings)).toContain("Pace = Time ÷ Distance");
  });
  it("finds finish time: a marathon at 5:00 per km is 3:30:59 (12,658.5 s rounds up)", () => {
    const { result } = pace({ solve: "time", distance: "42.195", paceMinutes: "5" });
    expect(formatClockShort(result!.seconds)).toBe("3:30:59");
    expect(text(result!.workings)).toContain("Finish time = Pace × Distance");
  });
  it("finds distance: 1 hour at 6:00 per mile is 10 miles", () => {
    const { result } = pace({ solve: "distance", hours: "1", paceMinutes: "6", paceUnit: "mi", distanceUnit: "mi" });
    expect(result!.metres / 1609.344).toBeCloseTo(10, 9);
  });
  it("converts between km and miles", () => {
    const { result } = pace({ distance: "6.2137119", distanceUnit: "mi", minutes: "50" });
    expect(pacePer(result!.secPerMetre, "mi")).toBe("8:03");
  });
  it("waits quietly for missing values and rejects zero and non-numbers", () => {
    expect(pace({ distance: "10" })).toEqual({ errors: {} });
    expect(pace({ distance: "0", minutes: "5" }).errors.distance).toMatch(/greater than 0/);
    expect(pace({ distance: "5", minutes: "0" }).errors.seconds).toMatch(/greater than 0/);
    expect(pace({ solve: "time", distance: "5", paceMinutes: "0", paceSeconds: "0" }).errors.paceSeconds).toMatch(/greater than 0/);
    expect(pace({ distance: "x", minutes: "5" }).errors.distance).toMatch(/number/);
  });
});

const time = (over: Partial<TimeRaw>) => evaluateTime({ op: "add", aDays: "", aHours: "", aMinutes: "", aSeconds: "", bDays: "", bHours: "", bMinutes: "", bSeconds: "", ...over } as TimeRaw);

describe("time calculator", () => {
  it("adds: 2 h 45 min 30 s + 1 h 30 min 50 s = 4 h 16 min 20 s", () => {
    const { result } = time({ aHours: "2", aMinutes: "45", aSeconds: "30", bHours: "1", bMinutes: "30", bSeconds: "50" });
    expect(formatSpan(result!.seconds)).toBe("4 h 16 min 20 s");
    expect(text(result!.workings)).toContain("Total = First time + Second time");
  });
  it("carries into days", () => {
    expect(formatSpan(time({ aHours: "20", bHours: "8" }).result!.seconds)).toBe("1 day 4 h");
  });
  it("subtracts and flags a negative result", () => {
    const ok = time({ op: "subtract", aHours: "3", bHours: "1", bMinutes: "15" }).result!;
    expect(formatSpan(ok.seconds)).toBe("1 h 45 min");
    expect(ok.negative).toBe(false);
    const neg = time({ op: "subtract", aMinutes: "10", bMinutes: "25" }).result!;
    expect(neg.negative).toBe(true);
    expect(formatSpan(neg.seconds)).toBe("15 min");
    expect(neg.workings.note).toMatch(/negative/);
  });
  it("needs both times and reports a bad field", () => {
    expect(time({ aHours: "1" })).toEqual({ errors: {} });
    expect(time({ aHours: "1", bHours: "x" }).errors.bHours).toMatch(/number/);
  });
});

const hours = (over: Partial<HoursRaw>) => evaluateHours({ start: "09:00", end: "17:30", breakMinutes: "30", days: "1", rate: "", ...over } as HoursRaw);

describe("hours calculator", () => {
  it("parses clock times", () => {
    expect(parseClock("09:30")).toBe(570);
    expect(parseClock("24:00")).toBeUndefined();
    expect(parseClock("9:60")).toBeUndefined();
    expect(parseClock("abc")).toBeUndefined();
  });
  it("09:00 to 17:30 with a 30 minute break is 8 hours", () => {
    const { result } = hours({});
    expect(result!.perDaySeconds).toBe(8 * 3600);
    expect(result!.overnight).toBe(false);
    expect(result!.pay).toBeUndefined();
  });
  it("counts several days and pay: 5 days at ₹250 an hour is 40 hours and ₹10,000", () => {
    const { result } = hours({ days: "5", rate: "250" });
    expect(result!.totalHours).toBe(40);
    expect(result!.pay).toBe(10_000);
    expect(text(result!.workings)).toContain("₹10,000.00");
  });
  it("handles a shift that ends after midnight", () => {
    const { result } = hours({ start: "22:00", end: "06:00", breakMinutes: "" });
    expect(result!.overnight).toBe(true);
    expect(result!.perDaySeconds).toBe(8 * 3600);
  });
  it("rejects equal times, a break as long as the shift and bad input", () => {
    expect(hours({ end: "09:00" }).errors.end).toMatch(/same/);
    expect(hours({ breakMinutes: "600" }).errors.breakMinutes).toMatch(/as long/);
    expect(hours({ days: "0" }).errors.days).toMatch(/greater than 0/);
    expect(hours({ days: "1.5" }).errors.days).toMatch(/whole/);
    expect(hours({ start: "" })).toEqual({ errors: {} });
  });
});

const date = (over: Partial<DateCalcRaw>) => evaluateDateCalc({ start: "2026-11-09", op: "add", years: "", months: "", weeks: "", days: "", ...over } as DateCalcRaw);
const iso = (r: ReturnType<typeof date>) => `${r.result!.date.y}-${String(r.result!.date.m).padStart(2, "0")}-${String(r.result!.date.d).padStart(2, "0")}`;

describe("date calculator", () => {
  it("adds days, weeks, months and years", () => {
    expect(iso(date({ days: "15" }))).toBe("2026-11-24");
    expect(iso(date({ weeks: "2" }))).toBe("2026-11-23");
    expect(iso(date({ months: "3" }))).toBe("2027-02-09");
    expect(iso(date({ years: "1", months: "1", weeks: "1", days: "1" }))).toBe("2027-12-17");
  });
  it("subtracts", () => {
    expect(iso(date({ op: "subtract", days: "9" }))).toBe("2026-10-31");
    expect(iso(date({ op: "subtract", years: "1" }))).toBe("2025-11-09");
  });
  it("uses the last day of a shorter month and explains it", () => {
    const r = date({ start: "2026-01-31", months: "1" });
    expect(iso(r)).toBe("2026-02-28");
    expect(text(r.result!.workings)).toContain("does not exist");
  });
  it("handles leap years", () => {
    expect(iso(date({ start: "2024-02-29", years: "1" }))).toBe("2025-02-28");
    expect(iso(date({ start: "2024-02-28", days: "1" }))).toBe("2024-02-29");
    expect(iso(date({ start: "2025-02-28", days: "1" }))).toBe("2025-03-01");
  });
  it("gives the weekday and days apart", () => {
    const r = date({ days: "15" });
    expect(r.result!.weekday).toBe("Tuesday");
    expect(r.result!.daysApart).toBe(15);
  });
  it("needs a date and an amount, and rejects bad values and out-of-range results", () => {
    expect(date({ start: "" })).toEqual({ errors: {} });
    expect(date({})).toEqual({ errors: {} });
    expect(date({ days: "1.5" }).errors.days).toMatch(/whole/);
    expect(date({ days: "-3" }).errors.days).toMatch(/less than 0/);
    expect(date({ start: "2026-02-30", days: "1" }).errors.start).toMatch(/real date/);
    expect(date({ start: "1900-01-01", op: "subtract", days: "1" }).errors.start).toMatch(/outside/);
  });
});
