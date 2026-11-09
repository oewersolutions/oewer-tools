/**
 * Maths for the BMI, BMR, calorie, body fat and ideal weight calculators. Pure functions, no DOM.
 * These are published estimates for healthy adults. They are general information, not medical advice, and say so on the pages.
 */
import { readNumber, type Evaluation } from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export type Units = "metric" | "imperial";
export type Sex = "male" | "female";

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;
const KJ_PER_KCAL = 4.184;

/** Everything the five calculators can ask for; each one reads only the fields it needs. */
export interface BodyRaw extends Record<string, string> {
  units: Units;
  sex: Sex;
  age: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  neck: string;
  waist: string;
  hip: string;
}

export interface Body {
  cm: number;
  kg: number;
  age: number;
  neckCm: number;
  waistCm: number;
  hipCm: number;
}

type Needs = {
  age?: boolean | "optional";
  weight?: boolean;
  neckWaist?: boolean;
  hip?: boolean;
};

const wLabel = (u: Units) => (u === "metric" ? "kg" : "lb");
const lLabel = (u: Units) => (u === "metric" ? "cm" : "in");

/** Reads the body measurements a calculator needs, in the visitor's units, and converts them to centimetres and kilograms. */
export function readBody(
  raw: BodyRaw,
  needs: Needs,
): {
  errors: Partial<Record<string, string>>;
  body?: Partial<Body> & { cm: number };
} {
  const errors: Partial<Record<string, string>> = {};
  const metric = raw.units === "metric";
  const out: Partial<Body> = {};
  let ready = true;
  const take = (
    key: string,
    label: string,
    rules: Parameters<typeof readNumber>[2],
  ): number | undefined => {
    const s = readNumber(raw[key] ?? "", label, rules);
    if ("error" in s) errors[key] = s.error;
    if (!("value" in s)) ready = false;
    return "value" in s ? s.value : undefined;
  };

  if (metric) {
    const h = take("heightCm", "Height", { positive: true, max: 272 });
    if (h !== undefined) out.cm = h;
    if (h !== undefined && h < 50) {
      errors.heightCm = "Height must be at least 50 cm.";
      ready = false;
    }
  } else {
    const ft = take("heightFt", "Feet", { integer: true, max: 8 });
    const inch = readNumber(raw.heightIn, "Inches", { max: 11.99 });
    if ("error" in inch) {
      errors.heightIn = inch.error;
      ready = false;
    }
    if (ft !== undefined) {
      const total =
        (ft * 12 + ("value" in inch ? inch.value : 0)) * CM_PER_INCH;
      if (total < 50) {
        errors.heightFt = "Height must be at least 20 inches.";
        ready = false;
      } else out.cm = total;
    }
  }
  if (needs.weight) {
    const w = take("weight", "Weight", {
      positive: true,
      max: metric ? 650 : 1400,
    });
    if (w !== undefined) out.kg = metric ? w : w * KG_PER_LB;
  }
  if (needs.age) {
    const required = needs.age === true;
    const state = readNumber(raw.age, "Age", {
      positive: true,
      integer: true,
      max: 120,
    });
    if ("error" in state) {
      errors.age = state.error;
      ready = false;
    } else if ("value" in state) out.age = state.value;
    else if (required) ready = false;
  }
  if (needs.neckWaist) {
    const neck = take("neck", "Neck", {
      positive: true,
      max: metric ? 100 : 40,
    });
    const waist = take("waist", "Waist", {
      positive: true,
      max: metric ? 300 : 120,
    });
    if (neck !== undefined) out.neckCm = metric ? neck : neck * CM_PER_INCH;
    if (waist !== undefined) out.waistCm = metric ? waist : waist * CM_PER_INCH;
  }
  if (needs.hip) {
    const hip = take("hip", "Hip", { positive: true, max: metric ? 300 : 120 });
    if (hip !== undefined) out.hipCm = metric ? hip : hip * CM_PER_INCH;
  }
  if (!ready || Object.keys(errors).length > 0 || out.cm === undefined)
    return { errors };
  return { errors, body: out as Partial<Body> & { cm: number } };
}

const showHeight = (raw: BodyRaw, cm: number): string =>
  raw.units === "metric"
    ? `${q(cm)} cm`
    : `${raw.heightFt} ft ${q(Number(raw.heightIn.replace(/[,\s]/g, "")) || 0)} in (${q(cm)} cm)`;
const showWeight = (raw: BodyRaw, kg: number): string =>
  raw.units === "metric"
    ? `${q(kg)} kg`
    : `${q(Number(raw.weight.replace(/[,\s]/g, "")))} lb (${q(kg)} kg)`;
/** A weight in the visitor's unit. */
export const weightIn = (kg: number, units: Units): string =>
  units === "metric"
    ? `${q(Math.round(kg * 10) / 10)} kg`
    : `${q(Math.round((kg / KG_PER_LB) * 10) / 10)} lb`;

const MEDICAL_NOTE =
  "General information, not medical advice. Speak to a doctor or a registered dietitian about your own health.";

// BMI

export type BmiScale = "who" | "asian";
export interface BmiRaw extends BodyRaw {
  scale: BmiScale;
}
export interface BmiResult {
  bmi: number;
  category?: string;
  healthyMinKg: number;
  healthyMaxKg: number;
  /** Kilograms to lose (negative) or gain (positive) to reach the healthy range, or 0 when inside it. */
  change: number;
  workings: Workings;
}

/** BMI categories. The usual adult cut-offs are 18.5, 25 and 30. For people from South Asian, Chinese, other Asian, Middle Eastern, Black African or African-Caribbean backgrounds, who are at risk of health problems at a slightly lower BMI, overweight starts at 23 and obesity at 27.5. */
export const BMI_BANDS: Record<BmiScale, { upTo: number; label: string }[]> = {
  who: [
    { upTo: 18.5, label: "Underweight" },
    { upTo: 25, label: "Normal weight" },
    { upTo: 30, label: "Overweight" },
    { upTo: Infinity, label: "Obese" },
  ],
  asian: [
    { upTo: 18.5, label: "Underweight" },
    { upTo: 23, label: "Normal weight" },
    { upTo: 27.5, label: "Overweight" },
    { upTo: Infinity, label: "Obese" },
  ],
};

export function evaluateBmi(raw: BmiRaw): Evaluation<BmiRaw, BmiResult> {
  const { errors, body } = readBody(raw, { weight: true, age: "optional" });
  if (!body || body.kg === undefined) return { errors };
  const m = body.cm / 100;
  const bmi = body.kg / (m * m);
  const bands = BMI_BANDS[raw.scale];
  const upper = raw.scale === "asian" ? 23 : 25;
  const healthyMinKg = 18.5 * m * m;
  const topOfRange = upper - 0.1; // the highest BMI still below the overweight cut-off
  const healthyMaxKg = topOfRange * m * m;
  const child = body.age !== undefined && body.age < 18;
  const category = child ? undefined : bands.find((b) => bmi < b.upTo)!.label;
  const change =
    bmi < 18.5
      ? healthyMinKg - body.kg
      : bmi >= upper
        ? healthyMaxKg - body.kg
        : 0;
  return {
    errors,
    result: {
      bmi,
      ...(category ? { category } : {}),
      healthyMinKg,
      healthyMaxKg,
      change,
      workings: {
        formula: [
          "BMI = weight (kg) ÷ height (m)²",
          "Healthy weight range = BMI limit × height (m)²",
        ],
        steps: [
          `Height = ${showHeight(raw, body.cm)} = ${q(m)} m, and weight = ${showWeight(raw, body.kg)}`,
          `BMI = ${q(body.kg)} ÷ (${q(m)} × ${q(m)}) = ${q(Math.round(bmi * 10) / 10)}`,
          child
            ? "The adult categories do not apply under 18, so no category is shown"
            : `Category: ${category} (${raw.scale === "asian" ? "cut-offs 18.5, 23 and 27.5" : "standard adult cut-offs 18.5, 25 and 30"})`,
          `Weight range for a BMI of 18.5 to ${q(topOfRange)}: ${q(18.5)} × ${q(m * m)} = ${q(Math.round(healthyMinKg * 10) / 10)} kg to ${q(topOfRange)} × ${q(m * m)} = ${q(Math.round(healthyMaxKg * 10) / 10)} kg`,
        ],
        note: `BMI compares weight with height and cannot tell muscle from fat, so it can mislead for athletes, older adults and pregnancy. The adult categories do not apply to children. ${MEDICAL_NOTE}`,
      },
    },
  };
}

// BMR

export type BmrFormula = "mifflin" | "harris";
export interface BmrRaw extends BodyRaw {
  formula: BmrFormula;
}
export interface BmrResult {
  bmr: number;
  other: { name: string; value: number };
  kj: number;
  workings: Workings;
}

export function mifflin(sex: Sex, kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
}
export function harrisBenedict(
  sex: Sex,
  kg: number,
  cm: number,
  age: number,
): number {
  return sex === "male"
    ? 13.397 * kg + 4.799 * cm - 5.677 * age + 88.362
    : 9.247 * kg + 3.098 * cm - 4.33 * age + 447.593;
}

export function evaluateBmr(raw: BmrRaw): Evaluation<BmrRaw, BmrResult> {
  const { errors, body } = readBody(raw, { weight: true, age: true });
  if (!body || body.kg === undefined || body.age === undefined)
    return { errors };
  const { kg, cm, age } = body;
  const sex = raw.sex;
  const m = mifflin(sex, kg, cm, age);
  const h = harrisBenedict(sex, kg, cm, age);
  const bmr = raw.formula === "mifflin" ? m : h;
  const steps =
    raw.formula === "mifflin"
      ? [
          `BMR = 10 × ${q(kg)} + 6.25 × ${q(cm)} − 5 × ${age} ${sex === "male" ? "+ 5" : "− 161"} = ${q(Math.round(bmr))} kcal a day`,
        ]
      : [
          sex === "male"
            ? `BMR = 13.397 × ${q(kg)} + 4.799 × ${q(cm)} − 5.677 × ${age} + 88.362 = ${q(Math.round(bmr))} kcal a day`
            : `BMR = 9.247 × ${q(kg)} + 3.098 × ${q(cm)} − 4.330 × ${age} + 447.593 = ${q(Math.round(bmr))} kcal a day`,
        ];
  return {
    errors,
    result: {
      bmr,
      other:
        raw.formula === "mifflin"
          ? { name: "Revised Harris–Benedict", value: h }
          : { name: "Mifflin–St Jeor", value: m },
      kj: bmr * KJ_PER_KCAL,
      workings: {
        formula:
          raw.formula === "mifflin"
            ? [
                "BMR = 10 × weight (kg) + 6.25 × height (cm) − 5 × age + s",
                "s = +5 for men and −161 for women (Mifflin–St Jeor)",
              ]
            : [
                "Men: BMR = 13.397 × kg + 4.799 × cm − 5.677 × age + 88.362",
                "Women: BMR = 9.247 × kg + 3.098 × cm − 4.330 × age + 447.593 (revised Harris–Benedict)",
              ],
        steps: [
          `Weight = ${showWeight(raw, kg)}, height = ${showHeight(raw, cm)}, age = ${age}, ${sex}`,
          ...steps,
          `In kilojoules: ${q(Math.round(bmr))} × 4.184 = ${q(Math.round(bmr * KJ_PER_KCAL))} kJ`,
        ],
        note: `BMR is the energy the body uses at complete rest, estimated from weight, height, age and sex. Equations are averages for populations, so your own figure can differ. ${MEDICAL_NOTE}`,
      },
    },
  };
}

// Calorie calculator

/** Physical activity levels (total energy use ÷ BMR). Each is the middle of a published range: sedentary 1.40–1.69, moderately active 1.70–1.99, vigorously active 2.00–2.40. */
export const ACTIVITY: Record<string, { label: string; pal: number }> = {
  sedentary: {
    label: "Mostly sitting, little exercise (PAL 1.40 to 1.69)",
    pal: 1.55,
  },
  moderate: {
    label:
      "Moderately active, on your feet or exercising most days (PAL 1.70 to 1.99)",
    pal: 1.85,
  },
  vigorous: {
    label:
      "Vigorously active, hard physical work or daily hard exercise (PAL 2.00 to 2.40)",
    pal: 2.2,
  },
};
/** The energy in a kilogram of body weight is often taken as about 7,700 kcal. It is a rough rule of thumb, not an exact figure. */
export const KCAL_PER_KG = 7700;

export interface CalorieRaw extends BodyRaw {
  activity: string;
  adjust: string;
}
export interface CalorieResult {
  bmr: number;
  maintenance: number;
  target: number;
  weeklyChangeKg: number;
  belowBmr: boolean;
  workings: Workings;
}

export function evaluateCalories(
  raw: CalorieRaw,
): Evaluation<CalorieRaw, CalorieResult> {
  const { errors, body } = readBody(raw, { weight: true, age: true });
  if (!body || body.kg === undefined || body.age === undefined)
    return { errors };
  const act = ACTIVITY[raw.activity];
  if (!act) return { errors };
  const bmr = mifflin(raw.sex, body.kg, body.cm, body.age);
  const maintenance = bmr * act.pal;
  const adjust = Number(raw.adjust);
  const target = maintenance + adjust;
  const weeklyChangeKg = (adjust * 7) / KCAL_PER_KG;
  return {
    errors,
    result: {
      bmr,
      maintenance,
      target,
      weeklyChangeKg,
      belowBmr: target < bmr,
      workings: {
        formula: [
          "BMR = 10 × kg + 6.25 × cm − 5 × age + s (Mifflin–St Jeor)",
          "Maintenance calories = BMR × physical activity level (PAL)",
          "Target = Maintenance + daily change",
        ],
        steps: [
          `BMR = 10 × ${q(body.kg)} + 6.25 × ${q(body.cm)} − 5 × ${body.age} ${raw.sex === "male" ? "+ 5" : "− 161"} = ${q(Math.round(bmr))} kcal`,
          `Maintenance = ${q(Math.round(bmr))} × ${q(act.pal)} = ${q(Math.round(maintenance))} kcal a day`,
          `Target = ${q(Math.round(maintenance))} ${adjust < 0 ? "−" : "+"} ${q(Math.abs(adjust))} = ${q(Math.round(target))} kcal a day`,
          ...(adjust === 0
            ? []
            : [
                `Rough weekly change = ${q(adjust)} × 7 ÷ ${KCAL_PER_KG.toLocaleString("en-IN")} = ${q(Math.round(weeklyChangeKg * 100) / 100)} kg, using the rule of thumb of about 7,700 kcal per kg`,
              ]),
        ],
        note: `The activity level is the middle of a published range, so real needs vary. Weight change from a calorie change is only a rough estimate. ${MEDICAL_NOTE}`,
      },
    },
  };
}

// Body fat (US Navy circumference method)

export interface FatResult {
  percent: number;
  fatKg: number;
  leanKg: number;
  workings: Workings;
}

/** Hodgdon and Beckett circumference equations, in centimetres. Undefined when the measurements give no valid answer. */
export function navyBodyFat(
  sex: Sex,
  heightCm: number,
  neckCm: number,
  waistCm: number,
  hipCm: number,
): number | undefined {
  const girth = sex === "male" ? waistCm - neckCm : waistCm + hipCm - neckCm;
  if (girth <= 0) return undefined;
  const density =
    sex === "male"
      ? 1.0324 - 0.19077 * Math.log10(girth) + 0.15456 * Math.log10(heightCm)
      : 1.29579 - 0.35004 * Math.log10(girth) + 0.221 * Math.log10(heightCm);
  return 495 / density - 450;
}

export function evaluateBodyFat(raw: BodyRaw): Evaluation<BodyRaw, FatResult> {
  const female = raw.sex === "female";
  const { errors, body } = readBody(raw, {
    weight: true,
    neckWaist: true,
    hip: female,
  });
  if (
    !body ||
    body.kg === undefined ||
    body.neckCm === undefined ||
    body.waistCm === undefined ||
    (female && body.hipCm === undefined)
  )
    return { errors };
  const hip = body.hipCm ?? 0;
  const percent = navyBodyFat(raw.sex, body.cm, body.neckCm, body.waistCm, hip);
  if (percent === undefined)
    return {
      errors: {
        waist: female
          ? "Waist plus hip must be more than the neck."
          : "Waist must be more than the neck.",
      },
    };
  if (percent < 2 || percent > 65)
    return {
      errors: {
        waist:
          "These measurements give a result that is not realistic. Check the numbers and that each was taken in the right place.",
      },
    };
  const fatKg = (body.kg * percent) / 100;
  const girth = female
    ? body.waistCm + hip - body.neckCm
    : body.waistCm - body.neckCm;
  return {
    errors,
    result: {
      percent,
      fatKg,
      leanKg: body.kg - fatKg,
      workings: {
        formula: female
          ? [
              "Body density = 1.29579 − 0.35004 × log10(waist + hip − neck) + 0.22100 × log10(height)",
              "Body fat % = 495 ÷ density − 450 (centimetres)",
            ]
          : [
              "Body density = 1.0324 − 0.19077 × log10(waist − neck) + 0.15456 × log10(height)",
              "Body fat % = 495 ÷ density − 450 (centimetres)",
            ],
        steps: [
          `Height ${q(body.cm)} cm, neck ${q(body.neckCm)} cm, waist ${q(body.waistCm)} cm${female ? `, hip ${q(hip)} cm` : ""}`,
          `${female ? "Waist + hip − neck" : "Waist − neck"} = ${q(girth)} cm`,
          `Body fat = ${q(Math.round(percent * 10) / 10)}%`,
          `Fat mass = ${q(body.kg)} kg × ${q(Math.round(percent * 10) / 10)} ÷ 100 = ${q(Math.round(fatKg * 10) / 10)} kg, and lean mass = ${q(Math.round((body.kg - fatKg) * 10) / 10)} kg`,
        ],
        note: `The US Navy method estimates body density from tape measurements and then body fat from that, so it carries the error of both steps and is less accurate than direct measurement. Measure the same places the same way each time. ${MEDICAL_NOTE}`,
      },
    },
  };
}

// Ideal weight

export interface IdealResult {
  devineKg: number;
  hamwiKg: number;
  bmiMinKg: number;
  bmiMaxKg: number;
  workings: Workings;
}

export const devine = (sex: Sex, cm: number): number =>
  (sex === "male" ? 50 : 45.5) + 0.9 * (cm - 152);
export const hamwi = (sex: Sex, cm: number): number =>
  sex === "male" ? 48 + 1.1 * (cm - 152) : 45.4 + 0.9 * (cm - 152);

export function evaluateIdealWeight(
  raw: BodyRaw,
): Evaluation<BodyRaw, IdealResult> {
  const { errors, body } = readBody(raw, {});
  if (!body) return { errors };
  const m = body.cm / 100;
  const dev = devine(raw.sex, body.cm);
  const ham = hamwi(raw.sex, body.cm);
  const min = 18.5 * m * m;
  const max = 24.9 * m * m;
  const male = raw.sex === "male";
  return {
    errors,
    result: {
      devineKg: dev,
      hamwiKg: ham,
      bmiMinKg: min,
      bmiMaxKg: max,
      workings: {
        formula: [
          male
            ? "Devine: 50 kg + 0.9 kg × (height in cm − 152)"
            : "Devine: 45.5 kg + 0.9 kg × (height in cm − 152)",
          male
            ? "Hamwi: 48 kg + 1.1 kg × (height in cm − 152)"
            : "Hamwi: 45.4 kg + 0.9 kg × (height in cm − 152)",
          "BMI range: 18.5 to 24.9 × height (m)²",
        ],
        steps: [
          `Height = ${showHeight(raw, body.cm)}`,
          `Devine = ${male ? 50 : 45.5} + 0.9 × (${q(body.cm)} − 152) = ${q(Math.round(dev * 10) / 10)} kg`,
          `Hamwi = ${male ? 48 : 45.4} + ${male ? 1.1 : 0.9} × (${q(body.cm)} − 152) = ${q(Math.round(ham * 10) / 10)} kg`,
          `BMI range = 18.5 × ${q(m * m)} = ${q(Math.round(min * 10) / 10)} kg to 24.9 × ${q(m * m)} = ${q(Math.round(max * 10) / 10)} kg`,
        ],
        note: `Ideal body weight formulas are rough estimates for adults that ignore body fat and muscle, so an athlete may be heavier than the figure and perfectly healthy. A healthy weight for you is a conversation for a doctor. ${MEDICAL_NOTE}`,
      },
    },
  };
}

export { wLabel, lLabel };
