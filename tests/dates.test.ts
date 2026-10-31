import { describe, expect, it } from "vitest";
import { addDays, addMonths, calculateAge, calculateDays, daysBetween, evaluateAge, evaluateDays, isLeapYear, nextBirthday, parseDate, spanBetween, weekdayOf, type YMD } from "../lib/tools/dates";

const D = (s: string): YMD => parseDate(s)!;

describe("calendar basics", () => {
  it("knows leap years by the Gregorian rule", () => {
    expect([1600, 2000, 2024, 2400].every(isLeapYear)).toBe(true);
    expect([1700, 1800, 1900, 2023, 2100, 2200].some(isLeapYear)).toBe(false);
  });
  it("parses only real dates in range", () => {
    expect(parseDate("2024-02-29")).toEqual({ y: 2024, m: 2, d: 29 });
    for (const bad of ["2023-02-29", "2024-13-01", "2024-00-10", "2024-04-31", "1899-12-31", "2201-01-01", "24-01-01", "", "2024-1-1"]) expect(parseDate(bad), bad).toBeUndefined();
  });
  it("counts days exactly across leap days and daylight saving changes", () => {
    expect(daysBetween(D("2024-02-28"), D("2024-03-01"))).toBe(2);
    expect(daysBetween(D("2023-02-28"), D("2023-03-01"))).toBe(1);
    expect(daysBetween(D("2000-01-01"), D("2001-01-01"))).toBe(366);
    expect(daysBetween(D("1900-01-01"), D("2000-01-01"))).toBe(36524);
    expect(daysBetween(D("2024-03-09"), D("2024-03-11"))).toBe(2); // a US clock-change weekend
  });
  it("adds days and months, clamping month ends", () => {
    expect(addDays(D("2024-02-28"), 2)).toEqual({ y: 2024, m: 3, d: 1 });
    expect(addDays(D("2024-01-01"), -1)).toEqual({ y: 2023, m: 12, d: 31 });
    expect(addMonths(D("2023-01-31"), 1)).toEqual({ y: 2023, m: 2, d: 28 });
    expect(addMonths(D("2024-01-31"), 1)).toEqual({ y: 2024, m: 2, d: 29 });
    expect(addMonths(D("2023-11-30"), 3)).toEqual({ y: 2024, m: 2, d: 29 });
  });
  it("names the weekday", () => {
    expect(weekdayOf(D("2000-01-01"))).toBe("Saturday");
    expect(weekdayOf(D("1970-01-01"))).toBe("Thursday");
  });
});

describe("years, months and days", () => {
  it("splits a normal span", () => {
    expect(spanBetween(D("1990-05-15"), D("2026-10-31"))).toEqual({ years: 36, months: 5, days: 16 });
  });
  it("borrows from month ends sensibly", () => {
    expect(spanBetween(D("2025-01-31"), D("2025-03-01"))).toEqual({ years: 0, months: 1, days: 1 });
    expect(spanBetween(D("2024-01-31"), D("2024-03-01"))).toEqual({ years: 0, months: 1, days: 1 });
    expect(spanBetween(D("2025-05-31"), D("2025-06-30"))).toEqual({ years: 0, months: 1, days: 0 }); // last day to last day is a whole month
    expect(spanBetween(D("2025-05-31"), D("2025-07-01"))).toEqual({ years: 0, months: 1, days: 1 });
  });
  it("is zero for the same day and exact on anniversaries", () => {
    expect(spanBetween(D("2020-06-15"), D("2020-06-15"))).toEqual({ years: 0, months: 0, days: 0 });
    expect(spanBetween(D("2000-03-01"), D("2025-03-01"))).toEqual({ years: 25, months: 0, days: 0 });
  });
});

describe("age", () => {
  it("handles a 29 February birth: birthday is 28 February in common years", () => {
    const born = D("2000-02-29");
    expect(nextBirthday(born, D("2023-03-01"))).toEqual({ y: 2024, m: 2, d: 29 });
    expect(nextBirthday(born, D("2024-03-01"))).toEqual({ y: 2025, m: 2, d: 28 });
    expect(calculateAge(born, D("2025-02-28")).span).toEqual({ years: 25, months: 0, days: 0 });
    expect(calculateAge(born, D("2024-02-29")).span).toEqual({ years: 24, months: 0, days: 0 });
  });
  it("counts days to the next birthday, zero on the day itself", () => {
    const born = D("1990-05-15");
    expect(calculateAge(born, D("2026-05-15")).daysToBirthday).toBe(0);
    expect(calculateAge(born, D("2026-05-14")).daysToBirthday).toBe(1);
    const a = calculateAge(born, D("2026-10-31"));
    expect(a.nextBirthday).toEqual({ y: 2027, m: 5, d: 15 });
    expect(a.daysToBirthday).toBe(196);
    expect(a.turning).toBe(37);
  });
  it("gives totals", () => {
    const a = calculateAge(D("2000-01-01"), D("2000-01-31"));
    expect(a.totalDays).toBe(30);
    expect(a.totalWeeks).toBe(4);
    expect(a.totalMonths).toBe(0);
    expect(a.bornOn).toBe("Saturday");
    expect(calculateAge(D("2000-01-01"), D("2025-01-01")).totalMonths).toBe(300);
  });
  it("validates input", () => {
    expect(evaluateAge({ born: "", asOf: "2026-10-31" })).toEqual({ errors: {} });
    expect(evaluateAge({ born: "2023-02-29", asOf: "2026-10-31" }).errors.born).toBeDefined();
    expect(evaluateAge({ born: "2027-01-01", asOf: "2026-10-31" }).errors.born).toBeDefined();
    expect(evaluateAge({ born: "1990-05-15", asOf: "2026-10-31" }).result?.span.years).toBe(36);
  });
});

describe("days between", () => {
  it("counts days, with the end date optional", () => {
    expect(calculateDays(D("2026-01-01"), D("2026-01-10"), false).totalDays).toBe(9);
    expect(calculateDays(D("2026-01-01"), D("2026-01-10"), true).totalDays).toBe(10);
    expect(calculateDays(D("2026-01-01"), D("2026-01-01"), false).totalDays).toBe(0);
    expect(calculateDays(D("2026-01-01"), D("2026-01-01"), true).totalDays).toBe(1);
  });
  it("shows weeks and the rest, and years, months and days", () => {
    const r = calculateDays(D("2026-01-01"), D("2026-03-15"), false);
    expect(r.totalDays).toBe(73);
    expect(r.weeks).toBe(10);
    expect(r.extraDays).toBe(3);
    expect(r.span).toEqual({ years: 0, months: 2, days: 14 });
  });
  it("works in either order and says so", () => {
    const r = calculateDays(D("2026-10-31"), D("2026-01-01"), false);
    expect(r.swapped).toBe(true);
    expect(r.totalDays).toBe(303);
    expect(r.from).toEqual({ y: 2026, m: 1, d: 1 });
  });
  it("crosses a leap day and a year end", () => {
    expect(calculateDays(D("2023-12-31"), D("2024-03-01"), false).totalDays).toBe(61);
    expect(calculateDays(D("2024-12-31"), D("2025-01-01"), true).totalDays).toBe(2);
  });
  it("validates input", () => {
    expect(evaluateDays({ start: "2026-01-01", end: "" }, false)).toEqual({ errors: {} });
    expect(evaluateDays({ start: "2026-02-30", end: "2026-03-01" }, false).errors.start).toBeDefined();
    expect(evaluateDays({ start: "2026-01-01", end: "2026-01-31" }, false).result?.totalDays).toBe(30);
  });
});
