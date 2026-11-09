/** Maths for the GPA and grade calculators. Pure functions, no DOM. */
import { readNumber } from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

/** Grade points on the common 4.0 scale used by US colleges. */
export const GRADE_POINTS: Record<string, number> = {
  "A+": 4,
  A: 4,
  "A-": 3.7,
  "B+": 3.3,
  B: 3,
  "B-": 2.7,
  "C+": 2.3,
  C: 2,
  "C-": 1.7,
  "D+": 1.3,
  D: 1,
  "D-": 0.7,
  F: 0,
};

export const COURSE_ROWS = 8;
const MAX_CREDITS = 50;

export interface GpaRaw {
  grades: string[];
  credits: string[];
}

export interface GpaResult {
  gpa: number;
  credits: number;
  qualityPoints: number;
  courses: number;
  workings: Workings;
}

/** Two decimals, rounding halves up the way people expect (3.025 is 3.03, not 3.02). */
export const show2 = (x: number): string =>
  (Math.round(Number((x * 100).toPrecision(12))) / 100).toFixed(2);

const t = (n: number) => q(Number(n.toPrecision(10)));

export function evaluateGpa(raw: GpaRaw): {
  errors: Record<number, string>;
  result?: GpaResult;
} {
  const errors: Record<number, string> = {};
  const used: { grade: string; points: number; credits: number }[] = [];
  raw.grades.forEach((grade, i) => {
    if (!Object.hasOwn(GRADE_POINTS, grade)) return;
    const c = readNumber(raw.credits[i] ?? "", `Credits for course ${i + 1}`, {
      positive: true,
      max: MAX_CREDITS,
    });
    if ("error" in c) errors[i] = c.error;
    else if ("value" in c)
      used.push({ grade, points: GRADE_POINTS[grade]!, credits: c.value });
  });
  if (Object.keys(errors).length > 0 || used.length === 0) return { errors };
  const credits = used.reduce((s, u) => s + u.credits, 0);
  const qualityPoints = used.reduce((s, u) => s + u.points * u.credits, 0);
  const gpa = qualityPoints / credits;
  return {
    errors,
    result: {
      gpa,
      credits,
      qualityPoints,
      courses: used.length,
      workings: {
        formula: ["GPA = Σ(grade points × credits) ÷ Σ credits"],
        steps: [
          ...used.map(
            (u, i) =>
              `Course ${i + 1}: grade ${u.grade} is ${t(u.points)} points × ${t(u.credits)} credits = ${t(u.points * u.credits)} quality points.`,
          ),
          `Total quality points = ${t(qualityPoints)} and total credits = ${t(credits)}.`,
          `GPA = ${t(qualityPoints)} ÷ ${t(credits)} = ${gpa.toFixed(3)}, shown as ${show2(gpa)}.`,
        ],
        note: "This uses the common unweighted 4.0 scale, where A+ and A are both 4.0. Schools differ on plus and minus grades and on honours weighting, so check your own school's table.",
      },
    },
  };
}

// CGPA (10-point) and percentage

export type CgpaDirection = "toPercent" | "toCgpa";
export interface CgpaRaw extends Record<string, string> {
  direction: CgpaDirection;
  value: string;
}
export const CGPA_FACTOR = 9.5;

export function evaluateCgpa(raw: CgpaRaw): {
  errors: Partial<Record<string, string>>;
  result?: { value: number; label: string; workings: Workings };
} {
  const toPercent = raw.direction === "toPercent";
  const s = readNumber(raw.value, toPercent ? "CGPA" : "Percentage", {
    positive: true,
    max: toPercent ? 10 : 100,
  });
  if ("error" in s) return { errors: { value: s.error } };
  if (!("value" in s)) return { errors: {} };
  const x = s.value;
  const value = toPercent ? x * CGPA_FACTOR : x / CGPA_FACTOR;
  return {
    errors: {},
    result: {
      value,
      label: toPercent ? "Percentage" : "CGPA (10-point)",
      workings: {
        formula: toPercent
          ? ["Percentage = CGPA × 9.5"]
          : ["CGPA = Percentage ÷ 9.5"],
        steps: [
          toPercent
            ? `${t(x)} × 9.5 = ${t(value)}%.`
            : `${t(x)} ÷ 9.5 = ${t(value)} on the 10-point scale.`,
        ],
        note: "9.5 is the multiplier published by CBSE for its 10-point CGPA. Universities and boards differ, so use your own institution's rule if it has one.",
      },
    },
  };
}

// Weighted grade and final-exam target

export const ASSESSMENT_ROWS = 6;
export type GradeMode = "average" | "final";

export interface WeightedRaw {
  mode: GradeMode;
  scores: string[];
  weights: string[];
  /** Weight of the final exam (percent of the course) and the grade wanted, for the "final" mode. */
  finalWeight: string;
  target: string;
}

export function letterFor(percent: number): string {
  return percent >= 90
    ? "A"
    : percent >= 80
      ? "B"
      : percent >= 70
        ? "C"
        : percent >= 60
          ? "D"
          : "F";
}

export interface WeightedResult {
  headline: string;
  headlineLabel: string;
  rows: { label: string; value: string }[];
  workings: Workings;
}

export function evaluateWeighted(raw: WeightedRaw): {
  errors: Record<string, string>;
  result?: WeightedResult;
} {
  const errors: Record<string, string> = {};
  const items: { score: number; weight: number }[] = [];
  for (let i = 0; i < ASSESSMENT_ROWS; i++) {
    const hasScore = (raw.scores[i] ?? "").trim() !== "";
    const hasWeight = (raw.weights[i] ?? "").trim() !== "";
    if (!hasScore && !hasWeight) continue;
    const sc = readNumber(raw.scores[i] ?? "", `Score ${i + 1}`, { max: 1000 });
    const w = readNumber(raw.weights[i] ?? "", `Weight ${i + 1}`, {
      positive: true,
      max: 100,
    });
    if ("error" in sc) errors[`score${i}`] = sc.error;
    if ("error" in w) errors[`weight${i}`] = w.error;
    if ("value" in sc && "value" in w)
      items.push({ score: sc.value, weight: w.value });
  }
  if (Object.keys(errors).length > 0 || items.length === 0) return { errors };
  const weightSum = items.reduce((s, i) => s + i.weight, 0);
  const points = items.reduce((s, i) => s + i.score * i.weight, 0);

  if (raw.mode === "average") {
    const avg = points / weightSum;
    return {
      errors,
      result: {
        headlineLabel: `Weighted grade · ${letterFor(avg)}`,
        headline: `${t(Number(avg.toFixed(4)))}%`,
        rows: [{ label: "Total weight entered", value: `${t(weightSum)}%` }],
        workings: {
          formula: ["Weighted grade = Σ(score × weight) ÷ Σ weight"],
          steps: [
            ...items.map(
              (i, n) =>
                `Item ${n + 1}: ${t(i.score)} × ${t(i.weight)} = ${t(i.score * i.weight)}.`,
            ),
            `Sum of score × weight = ${t(points)}, and the weights add up to ${t(weightSum)}.`,
            `${t(points)} ÷ ${t(weightSum)} = ${t(avg)}%, which is a ${letterFor(avg)} on a 90/80/70/60 scale.`,
          ],
          note: "Letter grades here use the common 90/80/70/60 cut-offs. Your course may use different ones.",
        },
      },
    };
  }

  const fw = readNumber(raw.finalWeight, "Final exam weight", {
    positive: true,
    max: 100,
  });
  const tg = readNumber(raw.target, "Grade you want", { max: 100 });
  if ("error" in fw) errors.finalWeight = fw.error;
  if ("error" in tg) errors.target = tg.error;
  if (!("value" in fw) || !("value" in tg)) return { errors };
  if (weightSum + fw.value > 100.0000001) {
    return {
      errors: {
        finalWeight: `The weights so far (${t(weightSum)}%) plus the final (${t(fw.value)}%) add up to more than 100%.`,
      },
    };
  }
  const needed = (tg.value - points / 100) / (fw.value / 100);
  const earned = points / 100;
  return {
    errors,
    result: {
      headlineLabel:
        needed > 100
          ? "Needed on the final · above 100%"
          : needed <= 0
            ? "Needed on the final · already reached"
            : "Needed on the final",
      headline: `${t(Number(Math.max(needed, 0).toFixed(4)))}%`,
      rows: [
        {
          label: "Points earned so far",
          value: `${t(Number(earned.toFixed(4)))}%`,
        },
        { label: "Weight still to come", value: `${t(fw.value)}%` },
      ],
      workings: {
        formula: [
          "Needed = (target − Σ(score × weight) ÷ 100) ÷ (final weight ÷ 100)",
        ],
        steps: [
          `Points earned so far = ${t(points)} ÷ 100 = ${t(earned)} out of the course's 100.`,
          `Points still needed = ${t(tg.value)} − ${t(earned)} = ${t(tg.value - earned)}.`,
          `Score needed on the final = ${t(tg.value - earned)} ÷ (${t(fw.value)} ÷ 100) = ${t(needed)}%.`,
        ],
        note:
          needed > 100
            ? "The score needed is above 100%, so the target cannot be reached without extra credit."
            : needed <= 0
              ? "You have already reached the target even with a zero on the final."
              : "This assumes the final is out of 100 and that your earlier scores and weights are right.",
      },
    },
  };
}
