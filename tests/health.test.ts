import { describe, expect, it } from "vitest";
import { evaluateConception, evaluateDue, evaluatePregnancy, trimesterOf, weeksDays, type ConceptionRaw, type DueRaw, type PregnancyRaw } from "../lib/tools/pregnancy";
import { devine, evaluateBmi, evaluateBmr, evaluateBodyFat, evaluateCalories, evaluateIdealWeight, hamwi, harrisBenedict, mifflin, navyBodyFat, type BmiRaw, type BmrRaw, type BodyRaw, type CalorieRaw } from "../lib/tools/health";
import { formatLong } from "../lib/tools/dates";

const text = (w: { formula: string[]; steps: string[] } | undefined) => [...(w?.formula ?? []), ...(w?.steps ?? [])].join("\n");
const body = (over: Partial<BodyRaw> = {}): BodyRaw => ({ units: "metric", sex: "male", age: "30", heightCm: "175", heightFt: "", heightIn: "", weight: "70", neck: "38", waist: "90", hip: "95", ...over });

describe("BMI", () => {
  it("70 kg at 175 cm is 22.9, normal, with the weight range for the height", () => {
    const { result } = evaluateBmi({ ...body(), scale: "who" } as BmiRaw);
    expect(result!.bmi).toBeCloseTo(22.857, 3);
    expect(result!.category).toBe("Normal weight");
    expect(result!.healthyMinKg).toBeCloseTo(56.66, 2);
    expect(result!.healthyMaxKg).toBeCloseTo(76.26, 2);
    expect(result!.change).toBe(0);
    expect(text(result!.workings)).toContain("BMI = weight (kg) ÷ height (m)²");
  });
  it("uses the WHO cut-offs 18.5, 25 and 30", () => {
    const cat = (w: string) => evaluateBmi({ ...body({ weight: w }), scale: "who" } as BmiRaw).result!.category;
    expect(cat("50")).toBe("Underweight"); // 16.3
    expect(cat("77")).toBe("Overweight"); // 25.1
    expect(cat("93")).toBe("Obese"); // 30.4
  });
  it("uses the Asian cut-offs 23 and 27.5 when chosen, and says how much to change", () => {
    const r = evaluateBmi({ ...body({ weight: "75" }), scale: "asian" } as BmiRaw).result!; // BMI 24.5
    expect(r.category).toBe("Overweight");
    expect(r.change).toBeCloseTo(22.9 * 1.75 ** 2 - 75, 6);
    expect(r.change).toBeLessThan(0);
    const under = evaluateBmi({ ...body({ weight: "50" }), scale: "who" } as BmiRaw).result!;
    expect(under.change).toBeGreaterThan(0);
  });
  it("accepts imperial units, and shows no adult category under 18", () => {
    const r = evaluateBmi({ ...body({ units: "imperial", heightFt: "5", heightIn: "9", weight: "154" }), scale: "who" } as BmiRaw).result!;
    expect(r.bmi).toBeCloseTo(22.74, 1);
    const kid = evaluateBmi({ ...body({ age: "12" }), scale: "who" } as BmiRaw).result!;
    expect(kid.category).toBeUndefined();
    expect(text(kid.workings)).toContain("do not apply under 18");
  });
  it("waits for input and rejects bad values", () => {
    expect(evaluateBmi({ ...body({ weight: "" }), scale: "who" } as BmiRaw)).toEqual({ errors: {} });
    expect(evaluateBmi({ ...body({ heightCm: "20" }), scale: "who" } as BmiRaw).errors.heightCm).toMatch(/at least 50/);
    expect(evaluateBmi({ ...body({ weight: "abc" }), scale: "who" } as BmiRaw).errors.weight).toMatch(/number/);
    expect(evaluateBmi({ ...body({ units: "imperial", heightFt: "5", heightIn: "13", weight: "150" }), scale: "who" } as BmiRaw).errors.heightIn).toMatch(/more than/);
  });
});

describe("BMR", () => {
  it("Mifflin–St Jeor: a 30-year-old man, 80 kg, 180 cm is 1,780 kcal", () => {
    expect(mifflin("male", 80, 180, 30)).toBe(1780);
    expect(mifflin("female", 60, 165, 28)).toBeCloseTo(1330.25, 6);
  });
  it("revised Harris–Benedict", () => {
    expect(harrisBenedict("male", 80, 180, 30)).toBeCloseTo(1853.632, 3);
    expect(harrisBenedict("female", 60, 165, 28)).toBeCloseTo(9.247 * 60 + 3.098 * 165 - 4.33 * 28 + 447.593, 6);
  });
  it("shows the chosen formula, the other one for comparison and kilojoules", () => {
    const r = evaluateBmr({ ...body({ weight: "80", heightCm: "180" }), formula: "mifflin" } as BmrRaw).result!;
    expect(r.bmr).toBe(1780);
    expect(r.other.name).toBe("Revised Harris–Benedict");
    expect(r.kj).toBeCloseTo(1780 * 4.184, 6);
    expect(text(r.workings)).toContain("10 × 80 + 6.25 × 180 − 5 × 30 + 5 = 1,780");
    expect(evaluateBmr({ ...body({ weight: "80", heightCm: "180" }), formula: "harris" } as BmrRaw).result!.bmr).toBeCloseTo(1853.632, 3);
  });
  it("needs an age", () => {
    expect(evaluateBmr({ ...body({ age: "" }), formula: "mifflin" } as BmrRaw)).toEqual({ errors: {} });
    expect(evaluateBmr({ ...body({ age: "30.5" }), formula: "mifflin" } as BmrRaw).errors.age).toMatch(/whole number/);
  });
});

describe("calorie calculator", () => {
  const cal = (over: Partial<CalorieRaw> = {}) => evaluateCalories({ ...body({ weight: "80", heightCm: "180" }), activity: "sedentary", adjust: "0", ...over } as CalorieRaw);
  it("maintenance is BMR times the activity level", () => {
    const { result } = cal();
    expect(result!.maintenance).toBeCloseTo(1780 * 1.55, 6);
    expect(result!.target).toBe(result!.maintenance);
    expect(result!.weeklyChangeKg).toBe(0);
  });
  it("a daily change gives a target and a rough weekly weight change", () => {
    const r = cal({ adjust: "-500" }).result!;
    expect(r.target).toBeCloseTo(1780 * 1.55 - 500, 6);
    expect(r.weeklyChangeKg).toBeCloseTo((-500 * 7) / 7700, 9);
    expect(text(r.workings)).toContain("7,700 kcal per kg");
  });
  it("warns when the target is below the BMR", () => {
    expect(cal({ adjust: "-1200" }).result!.belowBmr).toBe(true);
    expect(cal({ adjust: "-250" }).result!.belowBmr).toBe(false);
  });
  it("more activity needs more energy", () => {
    expect(cal({ activity: "vigorous" }).result!.maintenance).toBeGreaterThan(cal({ activity: "moderate" }).result!.maintenance);
  });
});

describe("body fat (US Navy)", () => {
  it("men: 180 cm, neck 38, waist 90 is about 19.8%", () => {
    const { result } = evaluateBodyFat(body({ heightCm: "180", weight: "80" }));
    expect(result!.percent).toBeCloseTo(19.8, 1);
    expect(result!.fatKg + result!.leanKg).toBeCloseTo(80, 9);
    expect(text(result!.workings)).toContain("Waist − neck = 52 cm");
  });
  it("women use the hip too", () => {
    const { result } = evaluateBodyFat(body({ sex: "female", heightCm: "165", weight: "60", neck: "33", waist: "75", hip: "95" }));
    expect(result!.percent).toBeGreaterThan(15);
    expect(result!.percent).toBeLessThan(45);
    expect(text(result!.workings)).toContain("Waist + hip − neck");
    expect(evaluateBodyFat(body({ sex: "female", hip: "" })).errors.hip).toBeUndefined();
    expect(evaluateBodyFat(body({ sex: "female", hip: "" }))).toEqual({ errors: {} });
  });
  it("a larger waist means more body fat", () => {
    expect(navyBodyFat("male", 180, 38, 100, 0)!).toBeGreaterThan(navyBodyFat("male", 180, 38, 85, 0)!);
  });
  it("rejects a neck bigger than the waist and unrealistic results", () => {
    expect(evaluateBodyFat(body({ neck: "95", waist: "90" })).errors.waist).toMatch(/more than the neck/);
    expect(evaluateBodyFat(body({ waist: "40", neck: "38" })).errors.waist).toMatch(/not realistic/);
  });
});

describe("ideal weight", () => {
  it("Devine and Hamwi follow the published formulas", () => {
    expect(devine("male", 175)).toBeCloseTo(70.7, 9);
    expect(devine("female", 165)).toBeCloseTo(57.2, 9);
    expect(hamwi("male", 175)).toBeCloseTo(73.3, 9);
    expect(hamwi("female", 165)).toBeCloseTo(57.1, 9);
  });
  it("also gives the BMI range for the height and the working", () => {
    const { result } = evaluateIdealWeight(body());
    expect(result!.devineKg).toBeCloseTo(70.7, 9);
    expect(result!.bmiMinKg).toBeCloseTo(56.66, 2);
    expect(result!.bmiMaxKg).toBeCloseTo(76.26, 2);
    expect(text(result!.workings)).toContain("Devine: 50 kg + 0.9 kg × (height in cm − 152)");
    expect(evaluateIdealWeight(body({ sex: "female" })).result!.workings.formula[0]).toContain("45.5");
  });
  it("needs only a height", () => {
    expect(evaluateIdealWeight(body({ weight: "", age: "" })).result).toBeDefined();
    expect(evaluateIdealWeight(body({ heightCm: "" }))).toEqual({ errors: {} });
  });
});

const due = (over: Partial<DueRaw> = {}) => evaluateDue({ method: "lmp", date: "2026-01-01", cycle: "28", ...over } as DueRaw);
const iso = (d: { y: number; m: number; d: number }) => `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;

describe("due date calculator", () => {
  it("adds 280 days to the last period: 1 January 2026 gives 8 October 2026", () => {
    const r = due().result!;
    expect(iso(r.due)).toBe("2026-10-08");
    expect(r.weekday).toBe("Thursday");
    expect(iso(r.conception)).toBe("2026-01-15");
    expect(text(r.workings)).toContain("+ 280 days");
  });
  it("adjusts for a longer or shorter cycle", () => {
    expect(iso(due({ cycle: "35" }).result!.due)).toBe("2026-10-15");
    expect(iso(due({ cycle: "35" }).result!.conception)).toBe("2026-01-22");
    expect(iso(due({ cycle: "26" }).result!.due)).toBe("2026-10-06");
  });
  it("from a conception date adds 266 days, the same answer for the matching period", () => {
    expect(iso(due({ method: "conception", date: "2026-01-15" }).result!.due)).toBe("2026-10-08");
    expect(iso(due({ method: "conception", date: "2026-01-15" }).result!.start)).toBe("2026-01-01");
  });
  it("lists the milestones", () => {
    const m = due().result!.milestones;
    expect(m).toHaveLength(5);
    expect(iso(m[2]!.date)).toBe("2026-07-16"); // 28 weeks
    expect(m[3]!.label).toMatch(/37 weeks/);
  });
  it("needs a date and checks it and the cycle", () => {
    expect(due({ date: "" })).toEqual({ errors: {} });
    expect(due({ date: "2026-02-30" }).errors.date).toMatch(/real date/);
    expect(due({ cycle: "10" }).errors.cycle).toMatch(/at least 20/);
    expect(due({ cycle: "abc" }).errors.cycle).toMatch(/number/);
    expect(due({ cycle: "" }).result).toBeDefined(); // an empty cycle means 28 days
  });
});

const preg = (over: Partial<PregnancyRaw> = {}) => evaluatePregnancy({ method: "lmp", date: "2026-01-01", asOf: "2026-03-12", cycle: "28", ...over } as PregnancyRaw);

describe("pregnancy calculator", () => {
  it("10 weeks 0 days after the last period, first trimester, 210 days to go", () => {
    const r = preg().result!;
    expect(r.days).toBe(70);
    expect(r.weeks).toBe(10);
    expect(r.extraDays).toBe(0);
    expect(r.trimester).toBe(1);
    expect(iso(r.due)).toBe("2026-10-08");
    expect(r.daysToDue).toBe(210);
    expect(r.percent).toBeCloseTo(25, 9);
    expect(text(r.workings)).toContain("10 weeks and 0 days");
  });
  it("works from a due date too", () => {
    const r = preg({ method: "due", date: "2026-10-08" }).result!;
    expect(r.days).toBe(70);
    expect(iso(r.due)).toBe("2026-10-08");
  });
  it("trimesters change at 14 and 28 weeks", () => {
    expect(trimesterOf(97)).toBe(1);
    expect(trimesterOf(98)).toBe(2);
    expect(trimesterOf(195)).toBe(2);
    expect(trimesterOf(196)).toBe(3);
    expect(weeksDays(203)).toBe("29 weeks 0 days");
  });
  it("counts days past the due date, and caps the progress at 100%", () => {
    const r = preg({ asOf: "2026-10-12" }).result!;
    expect(r.daysToDue).toBe(-4);
    expect(r.percent).toBe(100);
    expect(text(r.workings)).toContain("4 days past");
  });
  it("rejects dates before the start or far too late", () => {
    expect(preg({ asOf: "2025-12-01" }).errors.asOf).toMatch(/before the pregnancy started/);
    expect(preg({ asOf: "2027-03-01" }).errors.asOf).toMatch(/more than 43 weeks/);
    expect(preg({ date: "" })).toEqual({ errors: {} });
  });
  it("a longer cycle moves the weeks counted", () => {
    expect(preg({ cycle: "35" }).result!.days).toBe(63);
  });
});

const con = (over: Partial<ConceptionRaw> = {}) => evaluateConception({ method: "lmp", date: "2026-01-01", cycle: "28", ...over } as ConceptionRaw);

describe("conception calculator", () => {
  it("from the last period: about 14 days later in a 28-day cycle", () => {
    const r = con().result!;
    expect(iso(r.conception)).toBe("2026-01-15");
    expect(iso(r.due)).toBe("2026-10-08");
  });
  it("a 35-day cycle puts ovulation 21 days after the period started", () => {
    expect(iso(con({ cycle: "35" }).result!.conception)).toBe("2026-01-22");
  });
  it("from a due date: 266 days back, and 280 days back for the period", () => {
    const r = con({ method: "due", date: "2026-10-08" }).result!;
    expect(iso(r.conception)).toBe("2026-01-15");
    expect(iso(r.lmp)).toBe("2026-01-01");
    expect(formatLong(r.conception)).toBe("15 January 2026");
    expect(r.workings.note).toMatch(/estimate/);
  });
  it("rejects a bad date", () => {
    expect(con({ date: "2026-13-01" }).errors.date).toMatch(/real date/);
  });
});
