import { slugify } from "../posts";
import { checkToolContentSetting, isToolContentKey } from "../tools/content";
import type { ColumnDef, Issue, Schema, SheetDef, SheetRow, WorkbookData } from "./types";

const FORMULA_START = /^[=+\-@]/;
const NUMBER_LIKE = /^-?\d+(\.\d+)?$/;
const HTML = /<\/?[a-z][^>]*>|<!--/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const RESERVED_PAGE_SLUGS = new Set(["tools", "blog", "admin", "assets", "sitemap", "404"]);

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === "";

function checkLiteralText(value: string, multiline: boolean): string | null {
  if (!multiline && /[\r\n]/.test(value)) return "must be a single line";
  if (FORMULA_START.test(value) && !NUMBER_LIKE.test(value)) {
    return "must not start with '=', '+', '-' or '@' (looks like a spreadsheet formula)";
  }
  if (HTML.test(value)) return "must not contain HTML";
  return null;
}

function checkSitePath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) return "must be a site-relative path starting with a single '/'";
  if (value.includes("..") || /[\s\\]/.test(value)) return "must not contain '..', spaces or backslashes";
  return null;
}

/** Returns an error message, or null when the (non-empty) value is valid for the column. */
function checkValue(col: ColumnDef, value: unknown, sheet: SheetDef, schema: Schema): string | null {
  const limits = schema.limits;
  switch (col.type) {
    case "id": {
      if (typeof value !== "string") return "must be text";
      if (sheet.id_pattern && !new RegExp(sheet.id_pattern).test(value)) return `must match ${sheet.id_pattern}`;
      return null;
    }
    case "string":
    case "text": {
      if (typeof value !== "string") return "must be text";
      const bad = checkLiteralText(value, col.type === "text");
      if (bad) return bad;
      const max =
        col.max_length ??
        (col.max_length_key ? limits[col.max_length_key as keyof typeof limits] : undefined) ??
        (col.type === "text" ? limits.max_text_length : limits.max_string_length);
      if (value.length > max) return `is ${value.length} characters; the maximum is ${max}`;
      if (col.pattern && !new RegExp(col.pattern).test(value)) return `must match ${col.pattern}`;
      return null;
    }
    case "slug":
      return typeof value === "string" && SLUG.test(value) ? null : "must be a lowercase slug (a-z, 0-9, single hyphens)";
    case "path": {
      if (typeof value !== "string") return "must be text";
      return checkSitePath(value);
    }
    case "url": {
      if (typeof value !== "string") return "must be text";
      if (value.startsWith("/")) return checkSitePath(value);
      if (SCHEME.test(value) && !value.startsWith("https://")) return "external links must use https://";
      if (!value.startsWith("https://")) return "must be https:// or a site-relative path";
      try {
        new URL(value);
      } catch {
        return "is not a valid URL";
      }
      return null;
    }
    case "int": {
      if (typeof value !== "number" || !Number.isInteger(value)) return "must be a whole number";
      if (col.min !== undefined && value < col.min) return `must be at least ${col.min}`;
      return null;
    }
    case "bool":
      return typeof value === "boolean" ? null : "must be TRUE or FALSE";
    case "datetime": {
      if (typeof value !== "string" || !DATETIME.test(value) || Number.isNaN(Date.parse(value))) {
        return "must be a UTC ISO 8601 timestamp like 2026-10-29T08:30:00Z";
      }
      return null;
    }
    case "enum": {
      const allowed = schema.enums[col.enum ?? ""] ?? [];
      return allowed.includes(String(value)) ? null : `must be one of: ${allowed.join(", ")}`;
    }
    case "ref":
      return null; // checked against the referenced sheet in validateReferences
    default:
      return `has unknown schema type '${col.type}'`;
  }
}

/** Check that a value stored as text matches its declared value_type. */
function checkTypedSetting(value: unknown, valueType: unknown): string | null {
  if (isEmpty(value) || typeof value !== "string") return null;
  switch (valueType) {
    case "int":
      return /^-?\d+$/.test(value) ? null : "must be a whole number when value_type is 'int'";
    case "bool":
      return value === "true" || value === "false" ? null : "must be 'true' or 'false' when value_type is 'bool'";
    case "json":
      try {
        JSON.parse(value);
        return null;
      } catch {
        return "must be valid JSON when value_type is 'json'";
      }
    default:
      return null;
  }
}

export interface ValidateOptions {
  /** Component keys that exist in the tool registry. When given, every published tool must use one of them. */
  toolComponentKeys?: readonly string[];
}

export function validateWorkbook(data: WorkbookData, schema: Schema, options: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const add = (sheet: string, row: SheetRow | undefined, column: string | undefined, code: string, message: string) =>
    issues.push({ sheet, row: row?.row, column, code, message });

  const rowsOf = (sheet: string): SheetRow[] => data[sheet] ?? [];
  const keyIndex = (sheet: string, column: string): Set<string> =>
    new Set(rowsOf(sheet).map((r) => String(r.values[column] ?? "")));

  for (const [name, def] of Object.entries(schema.sheets)) {
    const rows = rowsOf(name);

    if (rows.length > schema.limits.max_rows_per_sheet) {
      add(name, undefined, undefined, "too_many_rows", `Has ${rows.length} rows; the maximum is ${schema.limits.max_rows_per_sheet}.`);
    }

    // Column-level checks
    for (const row of rows) {
      for (const col of def.columns) {
        const value = row.values[col.name];
        if (isEmpty(value)) {
          if (col.required) add(name, row, col.name, "required", "is required.");
          continue;
        }
        const problem = checkValue(col, value, def, schema);
        if (problem) add(name, row, col.name, "invalid_value", `${problem}.`);
      }
    }

    // Uniqueness
    for (const col of def.columns.filter((c) => c.unique || c.name === def.primary_key)) {
      const seen = new Map<string, number>();
      for (const row of rows) {
        const v = row.values[col.name];
        if (isEmpty(v)) continue;
        const key = String(v);
        const first = seen.get(key);
        if (first !== undefined) add(name, row, col.name, "duplicate", `'${key}' duplicates row ${first}.`);
        else seen.set(key, row.row);
      }
    }
    for (const group of def.unique_together ?? []) {
      const seen = new Map<string, number>();
      for (const row of rows) {
        if (group.some((c) => isEmpty(row.values[c]))) continue;
        const key = group.map((c) => String(row.values[c])).join("\u0000");
        const first = seen.get(key);
        if (first !== undefined) add(name, row, group.join("+"), "duplicate", `Combination of ${group.join(" + ")} duplicates row ${first}.`);
        else seen.set(key, row.row);
      }
    }

    // Foreign keys
    for (const col of def.columns.filter((c) => c.type === "ref")) {
      const [targetSheet, targetColumn] = (col.ref ?? "").split(".");
      if (!targetSheet || !targetColumn) continue;
      const valid = keyIndex(targetSheet, targetColumn);
      for (const row of rows) {
        const v = row.values[col.name];
        if (!isEmpty(v) && !valid.has(String(v))) {
          add(name, row, col.name, "broken_reference", `'${String(v)}' does not exist in ${targetSheet}.${targetColumn}.`);
        }
      }
    }

    // Polymorphic references (seo_metadata)
    if (def.polymorphic_ref) {
      const { type_column, id_column, targets } = def.polymorphic_ref;
      for (const row of rows) {
        const target = targets[String(row.values[type_column] ?? "")];
        const id = row.values[id_column];
        if (!target || isEmpty(id)) continue;
        const [targetSheet, targetColumn] = target.split(".");
        if (!keyIndex(targetSheet!, targetColumn!).has(String(id))) {
          add(name, row, id_column, "broken_reference", `'${String(id)}' does not exist in ${target}.`);
        }
      }
    }

    // Required keys (site_settings)
    for (const key of def.required_keys ?? []) {
      if (!rows.some((r) => r.values[def.primary_key] === key)) {
        add(name, undefined, def.primary_key, "missing_setting", `Required setting '${key}' is missing.`);
      }
    }
  }

  // value_type consistency
  for (const sheet of ["site_settings", "tool_settings"]) {
    for (const row of rowsOf(sheet)) {
      const problem = checkTypedSetting(row.values.setting_value, row.values.value_type);
      if (problem) add(sheet, row, "setting_value", "invalid_value", `${problem}.`);
    }
  }

  // Author pages are addressed by a slug made from the display name, so it must be usable and unique
  const authorSlugs = new Map<string, SheetRow>();
  for (const row of rowsOf("authors")) {
    const slug = slugify(String(row.values.display_name ?? ""));
    if (slug === "") add("authors", row, "display_name", "invalid_value", "must contain at least one letter or number.");
    else if (authorSlugs.has(slug)) add("authors", row, "display_name", "duplicate_slug", `makes the same author page address ('${slug}') as another author.`);
    else authorSlugs.set(slug, row);
  }

  // Tool page content (help, examples, FAQ, related tools)
  const toolIds = keyIndex("tools", "tool_id");
  for (const row of rowsOf("tool_settings")) {
    const key = String(row.values.setting_key ?? "");
    if (!isToolContentKey(key)) continue;
    const value = String(row.values.setting_value ?? "");
    const problem = checkToolContentSetting(key, value, String(row.values.value_type ?? ""));
    if (problem) add("tool_settings", row, "setting_value", "invalid_tool_content", `${problem}.`);
    if (key === "guides" && !problem && row.values.value_type === "json") {
      const postIds = keyIndex("posts", "post_id");
      for (const id of JSON.parse(value) as string[]) {
        if (!postIds.has(id)) add("tool_settings", row, "setting_value", "unknown_ref", `'${id}' is not a post_id in the posts sheet.`);
      }
    }
    if (key === "related" && !problem && row.values.value_type === "json") {
      for (const id of JSON.parse(value) as string[]) {
        if (!toolIds.has(id)) add("tool_settings", row, "setting_value", "unknown_ref", `'${id}' is not a tool_id in the tools sheet.`);
        if (id === row.values.tool_id) add("tool_settings", row, "setting_value", "invalid_tool_content", "A tool cannot be related to itself.");
      }
    }
  }

  // Published tools must have an approved component
  if (options.toolComponentKeys) {
    const known = new Set(options.toolComponentKeys);
    for (const tool of rowsOf("tools")) {
      if (tool.values.status === "published" && !known.has(String(tool.values.component_key))) {
        add("tools", tool, "component_key", "unknown_component", `'${String(tool.values.component_key)}' has no tool component, so the tool cannot be published.`);
      }
    }
  }

  // Reserved page slugs
  for (const row of rowsOf("pages")) {
    if (RESERVED_PAGE_SLUGS.has(String(row.values.slug))) {
      add("pages", row, "slug", "reserved_slug", `'${String(row.values.slug)}' is reserved for a site route.`);
    }
  }

  // Posts: published rules
  const blocksByPost = new Map<string, number>();
  for (const block of rowsOf("post_blocks")) {
    const postId = String(block.values.post_id ?? "");
    blocksByPost.set(postId, (blocksByPost.get(postId) ?? 0) + 1);
    const type = block.values.block_type;
    if (type === "image") {
      if (isEmpty(block.values.asset_path)) add("post_blocks", block, "asset_path", "required", "is required for image blocks.");
      if (isEmpty(block.values.content)) add("post_blocks", block, "content", "required", "is required for image blocks: write the alt text that describes the image.");
    } else if (isEmpty(block.values.content)) {
      add("post_blocks", block, "content", "required", `is required for '${String(type)}' blocks.`);
    }
  }
  for (const post of rowsOf("posts")) {
    if (post.values.status !== "published") continue;
    if (isEmpty(post.values.published_at)) add("posts", post, "published_at", "required", "is required when status is 'published'.");
    if (!blocksByPost.get(String(post.values.post_id))) {
      add("posts", post, "post_id", "no_content", "Published post has no post_blocks.");
    }
  }

  // Redirects: no self-redirects or chains/loops among enabled rows
  const enabled = rowsOf("redirects").filter((r) => r.values.enabled === true);
  const sources = new Set(enabled.map((r) => String(r.values.source_path)));
  for (const row of enabled) {
    const source = String(row.values.source_path);
    const target = String(row.values.target_path);
    if (source === target) add("redirects", row, "target_path", "redirect_loop", "Target must differ from source_path.");
    else if (sources.has(target)) add("redirects", row, "target_path", "redirect_chain", `Target '${target}' is itself redirected; point directly at the final page.`);
  }

  return issues;
}
