/** Unit conversion for the converter tool. Pure functions, no DOM, so it is unit tested directly. */

import { readNumber, type Evaluation } from "./finance";

export type UnitCategory = "length" | "weight" | "temperature" | "area" | "volume" | "speed";

export interface Unit {
  id: string;
  label: string;
  symbol: string;
  /** How many of the category's base unit make one of this unit. Temperature has no factor; see below. */
  factor: number;
}

// Every factor is the exact definition (or the standard rounded one where the definition is not a whole ratio) of the unit
// in the category's base unit: metre, kilogram, square metre, litre, metre per second.
const INCH = 0.0254;
const FOOT = 0.3048;
const POUND = 0.45359237;
const SQ_FOOT = FOOT * FOOT;
const US_GALLON = 3.785411784;

export const CATEGORY_LABELS: Record<UnitCategory, string> = {
  length: "Length",
  weight: "Weight",
  temperature: "Temperature",
  area: "Area",
  volume: "Volume",
  speed: "Speed",
};

export const UNITS: Record<UnitCategory, Unit[]> = {
  length: [
    { id: "mm", label: "Millimetre", symbol: "mm", factor: 0.001 },
    { id: "cm", label: "Centimetre", symbol: "cm", factor: 0.01 },
    { id: "m", label: "Metre", symbol: "m", factor: 1 },
    { id: "km", label: "Kilometre", symbol: "km", factor: 1000 },
    { id: "in", label: "Inch", symbol: "in", factor: INCH },
    { id: "ft", label: "Foot", symbol: "ft", factor: FOOT },
    { id: "yd", label: "Yard", symbol: "yd", factor: 0.9144 },
    { id: "mi", label: "Mile", symbol: "mi", factor: 1609.344 },
    { id: "nmi", label: "Nautical mile", symbol: "nmi", factor: 1852 },
  ],
  weight: [
    { id: "mg", label: "Milligram", symbol: "mg", factor: 0.000001 },
    { id: "g", label: "Gram", symbol: "g", factor: 0.001 },
    { id: "kg", label: "Kilogram", symbol: "kg", factor: 1 },
    { id: "quintal", label: "Quintal", symbol: "q", factor: 100 },
    { id: "tonne", label: "Tonne (metric ton)", symbol: "t", factor: 1000 },
    { id: "oz", label: "Ounce", symbol: "oz", factor: POUND / 16 },
    { id: "lb", label: "Pound", symbol: "lb", factor: POUND },
    { id: "st", label: "Stone", symbol: "st", factor: POUND * 14 },
  ],
  temperature: [
    { id: "c", label: "Celsius", symbol: "°C", factor: 1 },
    { id: "f", label: "Fahrenheit", symbol: "°F", factor: 1 },
    { id: "k", label: "Kelvin", symbol: "K", factor: 1 },
  ],
  area: [
    { id: "sqcm", label: "Square centimetre", symbol: "cm²", factor: 0.0001 },
    { id: "sqm", label: "Square metre", symbol: "m²", factor: 1 },
    { id: "sqkm", label: "Square kilometre", symbol: "km²", factor: 1e6 },
    { id: "ha", label: "Hectare", symbol: "ha", factor: 10000 },
    { id: "sqin", label: "Square inch", symbol: "in²", factor: INCH * INCH },
    { id: "sqft", label: "Square foot", symbol: "ft²", factor: SQ_FOOT },
    { id: "sqyd", label: "Square yard", symbol: "yd²", factor: 0.9144 * 0.9144 },
    { id: "acre", label: "Acre", symbol: "ac", factor: 43560 * SQ_FOOT },
    { id: "sqmi", label: "Square mile", symbol: "mi²", factor: 1609.344 * 1609.344 },
  ],
  volume: [
    { id: "ml", label: "Millilitre", symbol: "mL", factor: 0.001 },
    { id: "l", label: "Litre", symbol: "L", factor: 1 },
    { id: "m3", label: "Cubic metre", symbol: "m³", factor: 1000 },
    { id: "usfloz", label: "US fluid ounce", symbol: "US fl oz", factor: US_GALLON / 128 },
    { id: "uscup", label: "US cup", symbol: "US cup", factor: US_GALLON / 16 },
    { id: "uspint", label: "US pint", symbol: "US pt", factor: US_GALLON / 8 },
    { id: "usgal", label: "US gallon", symbol: "US gal", factor: US_GALLON },
    { id: "ukgal", label: "UK (imperial) gallon", symbol: "UK gal", factor: 4.54609 },
  ],
  speed: [
    { id: "ms", label: "Metre per second", symbol: "m/s", factor: 1 },
    { id: "kmh", label: "Kilometre per hour", symbol: "km/h", factor: 1 / 3.6 },
    { id: "mph", label: "Mile per hour", symbol: "mph", factor: 1609.344 / 3600 },
    { id: "kn", label: "Knot", symbol: "kn", factor: 1852 / 3600 },
    { id: "fts", label: "Foot per second", symbol: "ft/s", factor: FOOT },
  ],
};

/** The pair of units each category starts with. */
export const DEFAULT_UNITS: Record<UnitCategory, [from: string, to: string]> = {
  length: ["m", "ft"],
  weight: ["kg", "lb"],
  temperature: ["c", "f"],
  area: ["sqm", "sqft"],
  volume: ["l", "usgal"],
  speed: ["kmh", "mph"],
};

export const CATEGORIES = Object.keys(UNITS) as UnitCategory[];

export const unitsOf = (category: UnitCategory): Unit[] => UNITS[category];
export const findUnit = (category: UnitCategory, id: string): Unit | undefined => UNITS[category].find((u) => u.id === id);

/** Temperatures go through Celsius, because the scales differ by an offset as well as a size. */
const toCelsius = (id: string, v: number): number => (id === "f" ? ((v - 32) * 5) / 9 : id === "k" ? v - 273.15 : v);
const fromCelsius = (id: string, c: number): number => (id === "f" ? (c * 9) / 5 + 32 : id === "k" ? c + 273.15 : c);

/** Convert `value` from one unit to another of the same category. Throws for a unit that is not in the category. */
export function convert(category: UnitCategory, value: number, fromId: string, toId: string): number {
  const from = findUnit(category, fromId);
  const to = findUnit(category, toId);
  if (!from || !to) throw new Error(`Unknown ${category} unit '${!from ? fromId : toId}'.`);
  if (category === "temperature") return fromCelsius(to.id, toCelsius(from.id, value));
  return (value * from.factor) / to.factor;
}

export interface UnitConversion {
  unit: Unit;
  value: number;
}

export interface ConverterRaw extends Record<string, string> {
  value: string;
}
export interface ConverterResult {
  all: UnitConversion[];
}

/** Lowest temperature that exists, in Celsius: nothing can be colder than absolute zero. */
export const ABSOLUTE_ZERO_C = -273.15;
const MAX_VALUE = 1e15;

export function evaluateConverter(category: UnitCategory, fromId: string, raw: ConverterRaw): Evaluation<ConverterRaw, ConverterResult> {
  const state = readNumber(raw.value, "Value", { min: -MAX_VALUE, max: MAX_VALUE });
  if ("error" in state) return { errors: { value: state.error } };
  if ("empty" in state) return { errors: {} };
  // Only temperatures can be below zero; a negative length, weight, area, volume or speed is almost always a slip.
  if (category !== "temperature" && state.value < 0) return { errors: { value: "Value cannot be less than 0." } };
  if (category === "temperature" && toCelsius(fromId, state.value) < ABSOLUTE_ZERO_C - 1e-9) {
    return { errors: { value: "That is below absolute zero, the lowest temperature there can be." } };
  }
  return { errors: {}, result: { all: UNITS[category].map((unit) => ({ unit, value: convert(category, state.value, fromId, unit.id) })) } };
}

/** A number for display: grouped the Indian way, at most seven significant digits, and exponent form only at the extremes. */
export function formatQuantity(n: number): string {
  if (n === 0 || Object.is(n, -0)) return "0";
  const a = Math.abs(n);
  if (a >= 1e15 || a < 1e-9) return n.toExponential(4).replace("e+", "e");
  return n.toLocaleString("en-IN", { maximumSignificantDigits: 7, maximumFractionDigits: 12 });
}
