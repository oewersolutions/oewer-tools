import { createHash } from "node:crypto";
import type { ColumnDef, Schema, WorkbookData } from "./types";

export type ContentRecord = Record<string, string | number | boolean | null>;

export interface ContentExport {
  schema_version: string;
  /** SHA-256 of the serialized sheets; changes only when the content changes. */
  content_hash: string;
  sheets: Record<string, ContentRecord[]>;
}

const TEXT_TYPES = new Set(["id", "string", "text", "slug", "path", "url", "enum", "ref"]);

function normalize(col: ColumnDef, value: unknown): string | number | boolean | null {
  if (value === undefined || value === null || value === "") {
    if (col.default !== undefined) return col.default as string | number | boolean;
    return TEXT_TYPES.has(col.type) ? "" : null;
  }
  return value as string | number | boolean;
}

/** Order rows so output does not depend on the order they were typed in Excel. */
const SORT_KEYS: Record<string, string[]> = {
  navigation: ["location", "sort_order", "nav_id"],
  tool_categories: ["sort_order", "category_id"],
  tools: ["category_id", "sort_order", "tool_id"],
  post_blocks: ["post_id", "sort_order", "block_id"],
};

function compare(a: ContentRecord, b: ContentRecord, keys: string[]): number {
  for (const key of keys) {
    const x = a[key] ?? "";
    const y = b[key] ?? "";
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

/** Stable JSON: fixed key order comes from the schema, 2-space indent, trailing newline. */
export function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Turn validated workbook data into deterministic site content. Callers must validate first. */
export function buildContent(data: WorkbookData, schema: Schema): ContentExport {
  const sheets: Record<string, ContentRecord[]> = {};

  for (const [name, def] of Object.entries(schema.sheets)) {
    const records = (data[name] ?? []).map((row) => {
      const record: ContentRecord = {};
      for (const col of def.columns) record[col.name] = normalize(col, row.values[col.name]);
      return record;
    });

    const keys = SORT_KEYS[name] ?? [def.primary_key];
    records.sort((a, b) => compare(a, b, keys));
    sheets[name] = records;
  }

  // Newest posts first; ties broken by id so the order is always the same.
  sheets.posts!.sort((a, b) => compare(b, a, ["published_at"]) || compare(a, b, ["post_id"]));

  const content_hash = createHash("sha256").update(serialize(sheets)).digest("hex");
  return { schema_version: schema.schema_version, content_hash, sheets };
}
