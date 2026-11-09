/** Maths for the concrete calculator: volume of a slab, beam or round column, and the cement, sand and aggregate to mix it. Pure functions, no DOM. */
import { readNumber } from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export type Shape = "box" | "round";
export type LengthUnit = "m" | "ft";

export const MIXES = {
  m10: { label: "M10 (1 : 3 : 6)", parts: [1, 3, 6] },
  m15: { label: "M15 (1 : 2 : 4)", parts: [1, 2, 4] },
  m20: { label: "M20 (1 : 1.5 : 3)", parts: [1, 1.5, 3] },
  m25: { label: "M25 (1 : 1 : 2)", parts: [1, 1, 2] },
} as const;
export type MixKey = keyof typeof MIXES;

/** Dry volume is about 1.54 times the wet volume, because the dry materials shrink as water and cement fill the gaps. */
export const DRY_FACTOR = 1.54;
/** Bulk density of cement, in kilograms per cubic metre, and the size of an Indian cement bag. */
export const CEMENT_DENSITY = 1440;
export const BAG_KG = 50;
const FT_TO_M = 0.3048;

export interface ConcreteRaw extends Record<string, string> {
  shape: Shape;
  unit: LengthUnit;
  length: string;
  width: string;
  depth: string;
  diameter: string;
  height: string;
  count: string;
  waste: string;
  mix: MixKey;
}

export interface ConcreteResult {
  wetM3: number;
  withWasteM3: number;
  dryM3: number;
  cementKg: number;
  bags: number;
  sandM3: number;
  aggregateM3: number;
  workings: Workings;
}

const t = (n: number) => q(Number(n.toPrecision(8)));

export function evaluateConcrete(raw: ConcreteRaw): {
  errors: Partial<Record<string, string>>;
  result?: ConcreteResult;
} {
  const errors: Partial<Record<string, string>> = {};
  const get = (
    key: string,
    label: string,
    rules: Parameters<typeof readNumber>[2],
  ) => {
    const s = readNumber(raw[key] ?? "", label, rules);
    if ("error" in s) errors[key] = s.error;
    return "value" in s ? s.value : undefined;
  };
  const dims =
    raw.shape === "box"
      ? (["length", "width", "depth"] as const)
      : (["diameter", "height"] as const);
  const labels: Record<string, string> = {
    length: "Length",
    width: "Width",
    depth: "Depth or thickness",
    diameter: "Diameter",
    height: "Height",
  };
  const v: Record<string, number | undefined> = {};
  for (const d of dims)
    v[d] = get(d, labels[d]!, { positive: true, max: 10000 });
  const count = get("count", "Number of pieces", {
    positive: true,
    integer: true,
    max: 100000,
  });
  const waste = get("waste", "Wastage", { max: 50 });
  if (
    Object.keys(errors).length > 0 ||
    count === undefined ||
    waste === undefined ||
    dims.some((d) => v[d] === undefined)
  )
    return { errors };

  const k = raw.unit === "ft" ? FT_TO_M : 1;
  const m = (x: number) => x * k;
  const unit = raw.unit;
  const one =
    raw.shape === "box"
      ? m(v.length!) * m(v.width!) * m(v.depth!)
      : Math.PI * (m(v.diameter!) / 2) ** 2 * m(v.height!);
  const wet = one * count;
  const withWaste = wet * (1 + waste / 100);
  const dry = withWaste * DRY_FACTOR;
  const [c, s, a] = MIXES[raw.mix].parts;
  const total = c + s + a;
  const cementM3 = (dry * c) / total;
  const sandM3 = (dry * s) / total;
  const aggregateM3 = (dry * a) / total;
  const cementKg = cementM3 * CEMENT_DENSITY;
  const bags = cementKg / BAG_KG;

  const volumeStep =
    raw.shape === "box"
      ? `Volume of one piece = ${t(v.length!)} × ${t(v.width!)} × ${t(v.depth!)} ${unit}${unit === "ft" ? ` = ${t(one)} m³ (1 ft = 0.3048 m)` : ` = ${t(one)} m³`}.`
      : `Volume of one piece = π × (${t(v.diameter!)} ÷ 2)² × ${t(v.height!)} ${unit}${unit === "ft" ? ` = ${t(one)} m³ (1 ft = 0.3048 m)` : ` = ${t(one)} m³`}.`;
  return {
    errors,
    result: {
      wetM3: wet,
      withWasteM3: withWaste,
      dryM3: dry,
      cementKg,
      bags,
      sandM3,
      aggregateM3,
      workings: {
        formula: [
          raw.shape === "box"
            ? "volume = length × width × depth"
            : "volume = π × (diameter ÷ 2)² × height",
          `dry volume = wet volume × (1 + wastage) × ${DRY_FACTOR}`,
          "each material = dry volume × its part ÷ total parts",
          `cement bags = cement m³ × ${CEMENT_DENSITY} kg/m³ ÷ ${BAG_KG} kg`,
        ],
        steps: [
          volumeStep,
          `For ${count} piece${count === 1 ? "" : "s"}: ${t(one)} × ${count} = ${t(wet)} m³ of concrete.`,
          `Add ${t(waste)}% wastage: ${t(wet)} × ${t(1 + waste / 100)} = ${t(withWaste)} m³.`,
          `Dry volume of materials = ${t(withWaste)} × ${DRY_FACTOR} = ${t(dry)} m³.`,
          `Mix ${MIXES[raw.mix].label}: total parts = ${c} + ${s} + ${a} = ${total}.`,
          `Cement = ${t(dry)} × ${c} ÷ ${total} = ${t(cementM3)} m³ = ${t(cementKg)} kg = ${t(bags)} bags of ${BAG_KG} kg.`,
          `Sand = ${t(dry)} × ${s} ÷ ${total} = ${t(sandM3)} m³. Aggregate = ${t(dry)} × ${a} ÷ ${total} = ${t(aggregateM3)} m³.`,
        ],
        note: "A planning estimate only. Real mixes depend on the strength grade, water, the aggregate size and how well the site measures materials. Check the mix and quantities with your engineer or supplier.",
      },
    },
  };
}
