/**
 * Component keys that have an approved tool component. A published tool's `component_key` must be listed here.
 * Add the key here and its component in components/tools/registry.ts in the same change; the type of that
 * registry makes the build fail if the two disagree. Kept free of React so the workbook validator can use it.
 */
export const TOOL_COMPONENT_KEYS = [
  "emi-calculator",
  "fd-calculator",
  "gst-calculator",
  "sip-calculator",
  "lumpsum-calculator",
  "compound-interest-calculator",
  "simple-interest-calculator",
  "rd-calculator",
  "discount-calculator",
  "age-calculator",
  "days-between-dates",
  "unit-converter",
  "password-generator",
  "base64-encoder-decoder",
  "url-encoder-decoder",
  "uuid-generator",
  "hash-generator",
  "colour-converter",
  "timestamp-converter",
  "regex-tester",
  "jwt-decoder",
  "pdf-merge",
  "pdf-split",
  "images-to-pdf",
  "exif-remover",
  "image-crop-rotate",
  "percentage-calculator",
  "image-compressor",
  "image-resizer",
  "image-converter",
  "json-formatter",
  "qr-code-generator",
  "word-counter",
  "speed-distance-time",
  "pace-calculator",
  "time-calculator",
  "hours-calculator",
  "date-calculator",
  "loan-calculator",
  "auto-loan-calculator",
  "mortgage-calculator",
  "payment-calculator",
  "amortization-calculator",
  "interest-rate-calculator",
  "investment-calculator",
  "retirement-calculator",
  "inflation-calculator",
  "finance-calculator",
  "interest-calculator",
  "salary-calculator",
  "sales-tax-calculator",
  "income-tax-calculator",
  "bmi-calculator",
  "bmr-calculator",
  "calorie-calculator",
  "body-fat-calculator",
  "ideal-weight-calculator",
  "due-date-calculator",
  "pregnancy-calculator",
  "conception-calculator",
  "fraction-calculator",
  "random-number-generator",
  "triangle-calculator",
  "standard-deviation-calculator",
  "scientific-calculator",
  "gpa-calculator",
  "grade-calculator",
  "concrete-calculator",
  "subnet-calculator",
] as const;

export type ToolComponentKey = (typeof TOOL_COMPONENT_KEYS)[number];

/** Narrows a workbook's `component_key` to an approved key, throwing (and so failing the build) for one with no component. */
export function toolComponentKey(key: string): ToolComponentKey {
  if (!(TOOL_COMPONENT_KEYS as readonly string[]).includes(key)) {
    throw new Error(
      `Unknown tool component_key '${key}'. Register it in components/tools/registry.ts.`,
    );
  }
  return key as ToolComponentKey;
}
