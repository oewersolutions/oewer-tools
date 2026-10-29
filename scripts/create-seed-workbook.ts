/**
 * Generate data/oewer_database.xlsx with example seed content.
 *
 * Headers come from schemas/workbook_schema.json so the workbook always matches
 * the schema. Run from the repository root:
 *
 *   npx tsx scripts/create-seed-workbook.ts [outputPath]
 */
import { TOOL_CONTENT } from "./tool-content";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

type Cell = string | number | boolean;
type Row = Cell[];

interface Schema {
  sheets: Record<string, { columns: { name: string }[] }>;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_PATH = resolve(ROOT, "schemas/workbook_schema.json");
const DEFAULT_OUTPUT = resolve(ROOT, "data/oewer_database.xlsx");

const NOW = "2026-10-29T00:00:00Z";

const TOOL_CATEGORIES: Row[] = [
  ["TCAT0001", "Image Tools", "image-tools", "Compress, resize and convert images directly in your browser. Files never leave your device.", 1],
  ["TCAT0002", "Finance Calculators", "finance-calculators", "Calculators for loans, deposits, tax and everyday percentages.", 2],
  ["TCAT0003", "Developer Tools", "developer-tools", "Handy utilities for formatting and validating developer data.", 3],
  ["TCAT0004", "Utilities", "utilities", "Small everyday tools such as QR codes and word counting.", 4],
];

// [tool_id, category_id, name, slug, description, component_key, featured, sort_order]
const TOOLS: Row[] = [
  ["TOOL0001", "TCAT0001", "Image Compressor", "image-compressor", "Reduce image file size while keeping quality, entirely in your browser.", "image-compressor", true, 1],
  ["TOOL0002", "TCAT0001", "Image Resizer", "image-resizer", "Resize images to exact pixel dimensions or a percentage.", "image-resizer", false, 2],
  ["TOOL0003", "TCAT0001", "Image Format Converter", "image-converter", "Convert images between JPG, PNG and WebP.", "image-converter", false, 3],
  ["TOOL0004", "TCAT0002", "EMI Calculator", "emi-calculator", "Work out the monthly EMI, total interest and total payment for a loan.", "emi-calculator", true, 1],
  ["TOOL0005", "TCAT0002", "FD Interest Calculator", "fd-calculator", "Estimate the maturity amount and interest on a fixed deposit.", "fd-calculator", false, 2],
  ["TOOL0006", "TCAT0002", "GST Calculator", "gst-calculator", "Add or remove GST from an amount and see the tax breakdown.", "gst-calculator", false, 3],
  ["TOOL0007", "TCAT0002", "Percentage Calculator", "percentage-calculator", "Calculate percentages, increases, decreases and differences.", "percentage-calculator", false, 4],
  ["TOOL0008", "TCAT0003", "JSON Formatter and Validator", "json-formatter", "Format, minify and validate JSON with clear error messages.", "json-formatter", true, 1],
  ["TOOL0009", "TCAT0004", "QR Code Generator", "qr-code-generator", "Create QR codes for links and text and download them as images.", "qr-code-generator", false, 1],
  ["TOOL0010", "TCAT0004", "Word Counter", "word-counter", "Count words, characters, sentences and reading time as you type.", "word-counter", false, 2],
];

/** help, examples, FAQ and related-tool rows for every tool, numbered from `first`. */
function toolContentRows(first: number): Row[] {
  const rows: Row[] = [];
  const add = (toolId: string, key: string, value: string, type: string) => rows.push([`TSET${String(first + rows.length).padStart(4, "0")}`, toolId, key, value, type]);
  for (const [toolId, c] of Object.entries(TOOL_CONTENT)) {
    add(toolId, "help", c.help, "string");
    add(toolId, "examples", JSON.stringify(c.examples), "json");
    add(toolId, "faq", JSON.stringify(c.faq), "json");
    add(toolId, "related", JSON.stringify(c.related), "json");
  }
  return rows;
}

const SEED: Record<string, Row[]> = {
  site_settings: [
    ["schema_version", "1.0.1", "string", NOW],
    ["site_name", "OEWER Tools", "string", NOW],
    ["site_tagline", "Free online tools that respect your privacy", "string", NOW],
    ["site_url", "https://example.com", "string", NOW],
    ["primary_color", "#174f49", "string", NOW],
    ["contact_email", "hello@example.com", "string", NOW],
    ["search_enabled", "true", "bool", NOW],
    ["ads_enabled", "false", "bool", NOW],
  ],
  pages: [
    ["PAGE0001", "about", "About OEWER Tools", "OEWER Tools is a collection of free, fast online tools. Most tools run entirely in your browser, so your files and numbers stay on your device.\n\nWe publish practical guides alongside each tool so you understand how the results are calculated.", "published", NOW],
    ["PAGE0002", "privacy-policy", "Privacy Policy", "Draft placeholder. Replace with the final privacy policy before launch (see task T7.1).", "draft", NOW],
    ["PAGE0003", "terms", "Terms of Use", "Draft placeholder. Replace with the final terms of use before launch (see task T7.1).", "draft", NOW],
    ["PAGE0004", "contact", "Contact Us", "Questions or feedback? Email us at hello@example.com.", "published", NOW],
  ],
  navigation: [
    ["NAV0001", "Tools", "/tools", "header", 1, true],
    ["NAV0002", "Blog", "/blog", "header", 2, true],
    ["NAV0003", "About", "/about", "header", 3, true],
    ["NAV0004", "Contact", "/contact", "footer", 1, true],
    ["NAV0005", "Privacy Policy", "/privacy-policy", "footer_legal", 1, true],
    ["NAV0006", "Terms of Use", "/terms", "footer_legal", 2, true],
  ],
  tool_categories: TOOL_CATEGORIES.map((c) => [...c, true]),
  // Every tool has a component (Phase 3), so all are published.
  tools: TOOLS.map((t) => [t[0]!, t[1]!, t[2]!, t[3]!, t[4]!, t[5]!, "published", t[6]!, t[7]!]),
  tool_settings: [
    ["TSET0001", "TOOL0001", "max_file_size_mb", "25", "int"],
    ["TSET0002", "TOOL0001", "default_quality", "80", "int"],
    ["TSET0003", "TOOL0004", "default_currency_symbol", "₹", "string"],
    ["TSET0004", "TOOL0006", "default_gst_rate", "18", "int"],
    ...toolContentRows(5),
  ],
  blog_categories: [
    ["BCAT0001", "Money Guides", "money-guides", "Plain-language guides to loans, savings and tax."],
    ["BCAT0002", "How-To", "how-to", "Step-by-step guides for everyday tasks."],
  ],
  authors: [["AUTH0001", "OEWER Team", "The team behind OEWER Tools.", ""]],
  posts: [
    [
      "POST0001", "How EMI Is Calculated", "how-emi-is-calculated",
      "Understand the formula behind your loan EMI and how interest and tenure change what you pay.",
      "BCAT0001", "AUTH0001", "published", NOW, NOW,
    ],
  ],
  post_blocks: [
    ["BLK00001", "POST0001", 1, "paragraph", "An EMI, or equated monthly instalment, is the fixed amount you pay each month until a loan is cleared. Each payment covers part of the interest and part of the principal.", ""],
    ["BLK00002", "POST0001", 2, "heading", "The EMI formula", ""],
    ["BLK00003", "POST0001", 3, "paragraph", "EMI = P x r x (1 + r)^n / ((1 + r)^n - 1), where P is the loan amount, r is the monthly interest rate (annual rate divided by 12 and by 100) and n is the number of monthly instalments.", ""],
    ["BLK00004", "POST0001", 4, "heading", "What changes your EMI", ""],
    ["BLK00005", "POST0001", 5, "list", "A higher loan amount raises the EMI.\nA higher interest rate raises the EMI.\nA longer tenure lowers the EMI but increases the total interest paid.", ""],
  ],
  tags: [
    ["TAG0001", "Loans", "loans"],
    ["TAG0002", "Calculators", "calculators"],
  ],
  post_tags: [
    ["PTAG0001", "POST0001", "TAG0001"],
    ["PTAG0002", "POST0001", "TAG0002"],
  ],
  seo_metadata: [
    ["SEO0001", "tool", "TOOL0004", "EMI Calculator - Monthly Loan Payment", "Calculate your monthly loan EMI, total interest and total payment with this free EMI calculator.", "", false],
    ["SEO0002", "post", "POST0001", "How EMI Is Calculated - Formula Explained", "Learn the EMI formula and how loan amount, interest rate and tenure change your monthly payment.", "", false],
    ["SEO0003", "page", "PAGE0001", "About OEWER Tools", "OEWER Tools offers free, privacy-friendly online tools and practical guides.", "", false],
  ],
  advertisements: [
    ["AD0001", "top_banner", "home", false, ""],
    ["AD0002", "below_tool", "tool", false, ""],
    ["AD0003", "in_article", "blog_post", false, ""],
  ],
  redirects: [["RED0001", "/old-emi-calculator", "/tools/finance-calculators/emi-calculator", "301", false]],
  admin_settings: [["rows_per_page", "25", NOW]],
};

export async function buildSeedWorkbook(outputPath: string = DEFAULT_OUTPUT): Promise<void> {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as Schema;

  const unknown = Object.keys(SEED).filter((name) => !(name in schema.sheets));
  if (unknown.length > 0) throw new Error(`Seed data for unknown sheets: ${unknown.join(", ")}`);

  const wb = new ExcelJS.Workbook();
  wb.creator = "OEWER Tools seed script";

  for (const [sheetName, sheetDef] of Object.entries(schema.sheets)) {
    const rows = SEED[sheetName];
    if (!rows) throw new Error(`No seed data for sheet ${sheetName}`);
    const headers = sheetDef.columns.map((c) => c.name);

    const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(headers);
    for (const row of rows) {
      if (row.length !== headers.length) {
        throw new Error(`${sheetName}: row ${String(row[0])} has ${row.length} values, expected ${headers.length}`);
      }
      ws.addRow(row);
    }

    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF174F49" } };
    });
    headers.forEach((header, i) => {
      const longest = Math.max(header.length, ...rows.map((r) => String(r[i]).length));
      ws.getColumn(i + 1).width = Math.min(Math.max(longest + 2, 12), 60);
    });
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await wb.xlsx.writeFile(outputPath);
  console.log(`Wrote ${outputPath} (${Object.keys(schema.sheets).length} sheets)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSeedWorkbook(process.argv[2] ? resolve(process.argv[2]) : DEFAULT_OUTPUT);
}
