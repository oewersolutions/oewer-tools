import { describe, expect, it } from "vitest";
import { evaluateMotion, formatDuration, type MotionRaw } from "../lib/tools/motion";

const base: MotionRaw = { solve: "speed", distance: "", distanceUnit: "km", speed: "", speedUnit: "kmh", hours: "", minutes: "", seconds: "" };
const run = (over: Partial<MotionRaw>) => evaluateMotion({ ...base, ...over } as MotionRaw);

describe("speed, distance and time", () => {
  it("finds speed: 150 km in 2 h 30 min is 60 km/h", () => {
    const { result } = run({ solve: "speed", distance: "150", hours: "2", minutes: "30" });
    expect(result!.mps * 3.6).toBeCloseTo(60, 9);
    expect(result!.workings.formula).toEqual(["Speed = Distance ÷ Time"]);
    expect(result!.workings.steps.join("\n")).toContain("1,50,000 m");
    expect(result!.workings.steps.join("\n")).toContain("9,000 s");
  });

  it("finds distance: 60 mph for 90 minutes is 90 miles", () => {
    const { result } = run({ solve: "distance", speed: "60", speedUnit: "mph", distanceUnit: "mi", minutes: "90" });
    expect(result!.metres / 1609.344).toBeCloseTo(90, 9);
    expect(result!.workings.formula).toEqual(["Distance = Speed × Time"]);
  });

  it("finds time: 42.195 km at 12 km/h is 3 h 31 min (rounded to whole seconds)", () => {
    const { result } = run({ solve: "time", distance: "42.195", speed: "12" });
    expect(result!.seconds).toBeCloseTo(12658.5, 6);
    expect(formatDuration(result!.seconds)).toBe("3 h 30 min 59 s");
  });

  it("converts units: 1 knot is 1.852 km/h and 10 m/s is 36 km/h", () => {
    expect(run({ solve: "distance", speed: "1", speedUnit: "kn", hours: "1" }).result!.metres).toBeCloseTo(1852, 9);
    expect(run({ solve: "time", distance: "36", speed: "10", speedUnit: "ms" }).result!.seconds).toBeCloseTo(3600, 9);
  });

  it("waits quietly while a needed value is missing", () => {
    expect(run({ solve: "speed", distance: "10" })).toEqual({ errors: {} });
    expect(run({ solve: "time", distance: "10" })).toEqual({ errors: {} });
  });

  it("rejects zero, negative and non-numeric values with a message on the right field", () => {
    expect(run({ solve: "speed", distance: "0", hours: "1" }).errors.distance).toMatch(/greater than 0/);
    expect(run({ solve: "time", distance: "10", speed: "abc" }).errors.speed).toMatch(/number/);
    expect(run({ solve: "speed", distance: "10", hours: "-1" }).errors.hours).toMatch(/less than 0/);
    expect(run({ solve: "speed", distance: "10", hours: "0" }).errors.seconds).toMatch(/greater than 0/);
    expect(run({ solve: "time", distance: "10", speed: "0" }).errors.speed).toMatch(/greater than 0/);
  });

  it("accepts commas and decimal minutes", () => {
    const { result } = run({ solve: "speed", distance: "1,000", minutes: "0.5" });
    expect(result!.seconds).toBe(30);
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(3725)).toBe("1 h 2 min 5 s");
  });
});
