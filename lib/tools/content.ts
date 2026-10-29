/** Help, examples, FAQ and related-tool settings stored per tool in the `tool_settings` sheet. */

export interface ToolExample {
  title: string;
  text: string;
}
export interface ToolFaq {
  q: string;
  a: string;
}
export interface ToolContent {
  /** Restricted Markdown. */
  help: string;
  examples: ToolExample[];
  faq: ToolFaq[];
  /** tool_ids of related tools; when empty the page falls back to other tools in the same category. */
  related: string[];
}

export const TOOL_CONTENT_KEYS = ["help", "examples", "faq", "related"] as const;
export type ToolContentKey = (typeof TOOL_CONTENT_KEYS)[number];
export const isToolContentKey = (key: string): key is ToolContentKey => (TOOL_CONTENT_KEYS as readonly string[]).includes(key);

const MAX_ITEMS = 10;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim() !== "" && v.length <= max;

/** Why a stored setting is not valid tool content, or null when it is fine. JSON syntax is checked elsewhere. */
export function checkToolContentSetting(key: ToolContentKey, value: string, valueType: string): string | null {
  if (key === "help") return valueType === "string" ? null : "'help' must have value_type 'string'";
  if (valueType !== "json") return `'${key}' must have value_type 'json'`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null; // reported by the value_type check
  }
  if (!Array.isArray(parsed)) return `'${key}' must be a JSON list`;
  if (parsed.length > MAX_ITEMS) return `'${key}' can have at most ${MAX_ITEMS} items`;

  if (key === "examples") {
    return parsed.every((e) => isObject(e) && text(e.title, 100) && text(e.text, 500))
      ? null
      : `each item in 'examples' needs a 'title' (up to 100 characters) and a 'text' (up to 500)`;
  }
  if (key === "faq") {
    return parsed.every((e) => isObject(e) && text(e.q, 200) && text(e.a, 1000))
      ? null
      : `each item in 'faq' needs a question 'q' (up to 200 characters) and an answer 'a' (up to 1000)`;
  }
  return parsed.every((id) => typeof id === "string" && /^TOOL\d{4}$/.test(id)) ? null : "'related' must be a list of tool ids such as \"TOOL0004\"";
}

interface SettingRow {
  tool_id: string;
  setting_key: string;
  setting_value: string;
  value_type: string;
}

/** Assemble one tool's content from its settings rows. Missing parts are empty; the data is validated at export time. */
export function parseToolContent(rows: SettingRow[], toolId: string): ToolContent {
  const content: ToolContent = { help: "", examples: [], faq: [], related: [] };
  for (const row of rows) {
    if (row.tool_id !== toolId || !isToolContentKey(row.setting_key)) continue;
    if (row.setting_key === "help") content.help = row.setting_value;
    else content[row.setting_key] = JSON.parse(row.setting_value) as never;
  }
  return content;
}

/** Tools to suggest below a tool: the chosen ones, else other tools in its category. */
export function pickRelated<T extends { tool_id: string; category_id: string }>(tool: T, chosenIds: string[], published: T[], limit = 3): T[] {
  const byId = new Map(published.map((t) => [t.tool_id, t]));
  const chosen = chosenIds.map((id) => byId.get(id)).filter((t): t is T => t !== undefined && t.tool_id !== tool.tool_id);
  const pool = chosen.length > 0 ? chosen : published.filter((t) => t.category_id === tool.category_id && t.tool_id !== tool.tool_id);
  return pool.slice(0, limit);
}
