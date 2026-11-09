/** Maths for the triangle calculator: solve a triangle from three sides, two sides and the angle between them, or two angles and a side. Pure functions, no DOM. */
import { readNumber } from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export type TriangleMode = "sss" | "sas" | "aas";

export interface TriangleRaw extends Record<string, string> {
  mode: TriangleMode;
  a: string;
  b: string;
  c: string;
  angleA: string;
  angleB: string;
  angleC: string;
}

export interface TriangleResult {
  a: number;
  b: number;
  c: number;
  /** In degrees. */
  A: number;
  B: number;
  C: number;
  perimeter: number;
  area: number;
  bySides: string;
  byAngles: string;
  workings: Workings;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MAX_SIDE = 1e9;

/** Value for a working step, trimmed so that rounding noise never shows. */
const t = (n: number) => q(Number(n.toPrecision(10)));
const clamp = (x: number) => Math.min(1, Math.max(-1, x));

const FIELDS: Record<
  TriangleMode,
  { sides: ("a" | "b" | "c")[]; angles: ("angleA" | "angleB" | "angleC")[] }
> = {
  sss: { sides: ["a", "b", "c"], angles: [] },
  sas: { sides: ["a", "b"], angles: ["angleC"] },
  aas: { sides: ["a"], angles: ["angleA", "angleB"] },
};

export const fieldsFor = (mode: TriangleMode) => FIELDS[mode];

export function evaluateTriangle(raw: TriangleRaw): {
  errors: Partial<Record<string, string>>;
  result?: TriangleResult;
} {
  const errors: Partial<Record<string, string>> = {};
  const need = FIELDS[raw.mode];
  const v: Record<string, number> = {};
  let ready = true;
  for (const key of need.sides) {
    const s = readNumber(raw[key], `Side ${key}`, {
      positive: true,
      max: MAX_SIDE,
    });
    if ("error" in s) errors[key] = s.error;
    if ("value" in s) v[key] = s.value;
    else ready = false;
  }
  for (const key of need.angles) {
    const name = key.slice(-1);
    const s = readNumber(raw[key], `Angle ${name}`, { positive: true });
    if ("error" in s) errors[key] = s.error;
    else if ("value" in s && s.value >= 180) {
      errors[key] = `Angle ${name} must be less than 180 degrees.`;
      ready = false;
    } else if ("value" in s) v[key] = s.value;
    if (!("value" in s)) ready = false;
  }
  if (!ready) return { errors };

  const a = v.a!;
  let b = v.b!,
    c = v.c!;
  let A = 0,
    B = 0,
    C = 0;
  const formula: string[] = [];
  const steps: string[] = [];

  if (raw.mode === "sss") {
    if (a + b <= c || a + c <= b || b + c <= a) {
      return {
        errors: {
          a: "These sides cannot make a triangle: each side must be shorter than the other two added together.",
        },
      };
    }
    A = Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c))) * DEG;
    B = Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c))) * DEG;
    C = 180 - A - B;
    formula.push(
      "cos A = (b² + c² − a²) ÷ (2bc)",
      "cos B = (a² + c² − b²) ÷ (2ac)",
      "C = 180° − A − B",
    );
    steps.push(
      `Angle A: cos A = (${t(b)}² + ${t(c)}² − ${t(a)}²) ÷ (2 × ${t(b)} × ${t(c)}) = ${t((b * b + c * c - a * a) / (2 * b * c))}, so A = ${t(A)}°.`,
      `Angle B: cos B = (${t(a)}² + ${t(c)}² − ${t(b)}²) ÷ (2 × ${t(a)} × ${t(c)}) = ${t((a * a + c * c - b * b) / (2 * a * c))}, so B = ${t(B)}°.`,
      `Angle C = 180° − ${t(A)}° − ${t(B)}° = ${t(C)}°.`,
    );
  } else if (raw.mode === "sas") {
    C = v.angleC!;
    c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C * RAD));
    A = Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c))) * DEG;
    B = 180 - A - C;
    formula.push(
      "c² = a² + b² − 2ab cos C",
      "cos A = (b² + c² − a²) ÷ (2bc)",
      "B = 180° − A − C",
    );
    steps.push(
      `Third side: c² = ${t(a)}² + ${t(b)}² − 2 × ${t(a)} × ${t(b)} × cos ${t(C)}° = ${t(c * c)}, so c = ${t(c)}.`,
      `Angle A: cos A = (${t(b)}² + ${t(c)}² − ${t(a)}²) ÷ (2 × ${t(b)} × ${t(c)}) = ${t((b * b + c * c - a * a) / (2 * b * c))}, so A = ${t(A)}°.`,
      `Angle B = 180° − ${t(A)}° − ${t(C)}° = ${t(B)}°.`,
    );
  } else {
    A = v.angleA!;
    B = v.angleB!;
    if (A + B >= 180)
      return {
        errors: {
          angleB: "Angles A and B must add up to less than 180 degrees.",
        },
      };
    C = 180 - A - B;
    b = (a * Math.sin(B * RAD)) / Math.sin(A * RAD);
    c = (a * Math.sin(C * RAD)) / Math.sin(A * RAD);
    formula.push("C = 180° − A − B", "a ÷ sin A = b ÷ sin B = c ÷ sin C");
    steps.push(
      `Angle C = 180° − ${t(A)}° − ${t(B)}° = ${t(C)}°.`,
      `Side b = a × sin B ÷ sin A = ${t(a)} × sin ${t(B)}° ÷ sin ${t(A)}° = ${t(b)}.`,
      `Side c = a × sin C ÷ sin A = ${t(a)} × sin ${t(C)}° ÷ sin ${t(A)}° = ${t(c)}.`,
    );
  }

  const perimeter = a + b + c;
  const s = perimeter / 2;
  let area: number;
  if (raw.mode === "sss") {
    area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    formula.push(
      "area = √( s (s − a)(s − b)(s − c) ), where s is half the perimeter",
    );
    steps.push(
      `Perimeter = ${t(a)} + ${t(b)} + ${t(c)} = ${t(perimeter)}, so s = ${t(s)}.`,
      `Area (Heron's formula) = √(${t(s)} × ${t(s - a)} × ${t(s - b)} × ${t(s - c)}) = ${t(area)}.`,
    );
  } else {
    area = 0.5 * a * b * Math.sin(C * RAD);
    formula.push("area = ½ ab sin C");
    steps.push(
      `Perimeter = ${t(a)} + ${t(b)} + ${t(c)} = ${t(perimeter)}.`,
      `Area = ½ × ${t(a)} × ${t(b)} × sin ${t(C)}° = ${t(area)}.`,
    );
  }

  const near = (x: number, y: number) =>
    Math.abs(x - y) <= 1e-9 * Math.max(x, y);
  const equal = [near(a, b), near(b, c), near(a, c)].filter(Boolean).length;
  const bySides =
    equal >= 3 ? "Equilateral" : equal >= 1 ? "Isosceles" : "Scalene";
  const biggest = Math.max(A, B, C);
  const byAngles =
    Math.abs(biggest - 90) < 1e-7 ? "Right" : biggest > 90 ? "Obtuse" : "Acute";

  return {
    errors,
    result: {
      a,
      b,
      c,
      A: Number(A.toFixed(10)),
      B: Number(B.toFixed(10)),
      C: Number(C.toFixed(10)),
      perimeter,
      area,
      bySides,
      byAngles,
      workings: {
        formula,
        steps,
        note: "The three angles of a triangle always add up to 180°. Lengths are in whatever unit you used, and the area is in that unit squared.",
      },
    },
  };
}
