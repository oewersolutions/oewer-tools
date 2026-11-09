import { calculateEmi, calculateFd, calculateGst } from "./tools/finance";
import { calculateLumpsum, calculateSip } from "./tools/growth";
import { calculateDiscount, calculateRd } from "./tools/deposits";
import { monthlyPayment } from "./tools/loans";
import { futureValue } from "./tools/planning";
import { evaluateMotion } from "./tools/motion";
import { formatQuantity } from "./tools/units";
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
    case "speed-distance-time": {
      const r = evaluateMotion({ solve: "speed", distance: "150", distanceUnit: "km", speed: "", speedUnit: "kmh", hours: "2", minutes: "30", seconds: "" }).result!;
      return { note: "150 km in 2 h 30 min", value: `${formatQuantity(r.mps * 3.6)} km/h` };
    }
    case "investment-calculator":
      return { note: "₹1,00,000 and ₹5,000 a month at 12% for 10 years", value: rupees(futureValue(100_000, 5000, 0.01, 120)) };
    case "retirement-calculator":
      return { note: "Will your savings last?", value: "Check your plan" };
    case "inflation-calculator":
      return { note: "₹1,00,000 today at 6% for 10 years", value: `${rupees(100_000 * 1.06 ** 10)} later` };
    case "finance-calculator":
      return { note: "Final amount, start, deposit, rate or time", value: "Solve any one" };
    case "interest-calculator":
      return { note: "Simple against compound interest", value: "Side by side" };
    case "loan-calculator":
      return { note: "₹10,00,000 at 9% for 5 years", value: `${rupees(monthlyPayment(1_000_000, 9, 60))} a month` };
    case "auto-loan-calculator":
      return { note: "₹8,00,000 loan at 9% for 5 years", value: `${rupees(monthlyPayment(800_000, 9, 60))} a month` };
    case "mortgage-calculator":
      return { note: "₹40,00,000 at 8.5% for 20 years", value: `${rupees(monthlyPayment(4_000_000, 8.5, 240))} a month` };
    case "payment-calculator":
      return { note: "Payment, loan size or payoff time", value: "Find any one" };
    case "amortization-calculator":
      return { note: "Interest and principal of every EMI", value: "Full schedule" };
    case "interest-rate-calculator":
      return { note: "From the loan, the EMI and the tenure", value: "Find the rate" };
    case "pace-calculator":
      return { note: "10 km in 55 minutes", value: "5:30 per km" };
    case "time-calculator":
      return { note: "2 h 45 min plus 1 h 30 min", value: "4 h 15 min" };
    case "hours-calculator":
      return { note: "09:00 to 17:30, 30 min break", value: "8 hours" };
    case "date-calculator":
      return { note: "9 Nov 2026 plus 15 days", value: "24 Nov 2026" };
    case "unit-converter":
      return { note: "Length, weight, temperature and more", value: "Every unit" };
    case "password-generator":
      return { note: "Random, made in your browser", value: "Strong passwords" };
    case "base64-encoder-decoder":
      return { note: "Text to Base64 and back", value: "aGVsbG8=" };
    case "url-encoder-decoder":
      return { note: "Percent-encode and decode", value: "%20" };
    case "uuid-generator":
      return { note: "Random version 4 and 7", value: "Unique IDs" };
    case "hash-generator":
      return { note: "SHA-1, SHA-256, SHA-384, SHA-512", value: "Hashes" };
    case "colour-converter":
      return { note: "HEX, RGB and HSL", value: "#1a73e8" };
    case "timestamp-converter":
      return { note: "Unix time and dates", value: "1700000000" };
    case "regex-tester":
      return { note: "Matches, groups, safe timeout", value: "\\d+" };
    case "jwt-decoder":
      return { note: "Read a token's header and payload", value: "JWT" };
    case "pdf-merge":
      return { note: "Combine PDFs in your order", value: "One PDF" };
    case "pdf-split":
      return { note: "Pull out pages or ranges", value: "Pages 1-3" };
    case "images-to-pdf":
      return { note: "JPG, PNG and WebP to PDF", value: "Pictures to PDF" };
    case "exif-remover":
      return { note: "Remove GPS and camera data", value: "Clean photos" };
    case "image-crop-rotate":
      return { note: "Crop, rotate and flip", value: "Any shape" };
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
