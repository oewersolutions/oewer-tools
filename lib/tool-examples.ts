import { calculateEmi, calculateFd, calculateGst } from "./tools/finance";
import { calculateLumpsum, calculateSip } from "./tools/growth";
import { calculateDiscount, calculateRd } from "./tools/deposits";
import { calculateCompound, calculateSimple } from "./tools/interest";

/** Whole rupees in the Indian number format, for the figures on cards. */
const rupees = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export interface ToolExample {
  /** Small line above the number: what the example is. */
  note: string;
  /** The number or phrase that leads the card. */
  value: string;
}

/**
 * The line shown on a tool card: a real result from the tool's own maths for the finance tools, so the number on the
 * card can never drift from what the tool says, and a plain phrase for the others. Cards for tools without an
 * entry just say "Open".
 */
export function toolExample(componentKey: string): ToolExample | null {
  switch (componentKey) {
    case "emi-calculator":
      return {
        note: "₹10,00,000 at 9% for 5 years",
        value: `${rupees(calculateEmi(1_000_000, 9, 60).emi)}/month`,
      };
    case "fd-calculator":
      return {
        note: "₹1,00,000 at 7% for 3 years",
        value: rupees(calculateFd(100_000, 7, 3, 4).maturityAmount),
      };
    case "gst-calculator":
      return {
        note: "₹1,000 at 18% GST",
        value: `${rupees(calculateGst(1000, 18, "add").gstAmount)} GST`,
      };
    case "sip-calculator":
      return { note: "₹5,000 a month at 12% for 10 years", value: rupees(calculateSip(5000, 12, 10).maturity) };
    case "lumpsum-calculator":
      return { note: "₹1,00,000 at 12% for 10 years", value: rupees(calculateLumpsum(100_000, 12, 10).maturity) };
    case "compound-interest-calculator":
      return { note: "₹1,00,000 at 8% for 10 years", value: rupees(calculateCompound(100_000, 8, 10, 1).amount) };
    case "simple-interest-calculator":
      return { note: "₹1,00,000 at 8% for 3 years", value: `${rupees(calculateSimple(100_000, 8, 3, "years").interest)} interest` };
    case "rd-calculator":
      return { note: "₹5,000 a month at 6.5% for 5 years", value: rupees(calculateRd(5000, 6.5, 60).maturity) };
    case "discount-calculator":
      return { note: "₹2,000 with 20% then 10% off", value: rupees(calculateDiscount(2000, 20, 10).finalPrice) };
    case "age-calculator":
      return { note: "Years, months and days", value: "Exact age" };
    case "days-between-dates":
      return { note: "With or without the end date", value: "Count days" };
    case "percentage-calculator":
      return { note: "15% of 2,000", value: "300" };
    case "image-compressor":
      return { note: "JPG, PNG and WebP", value: "Smaller files" };
    case "image-resizer":
      return { note: "By pixels or percent", value: "Exact sizes" };
    case "image-converter":
      return { note: "JPG, PNG and WebP", value: "Any format" };
    case "json-formatter":
      return { note: "Format, minify, check", value: "Valid JSON" };
    case "qr-code-generator":
      return { note: "Links, text and Wi-Fi", value: "PNG and SVG" };
    case "word-counter":
      return { note: "Words and reading time", value: "Count live" };
    default:
      return null;
  }
}
