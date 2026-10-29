/** JSON formatting and validation for the JSON tool. Pure functions, so they are unit tested without a browser. */

export const MAX_JSON_CHARS = 5_000_000;

export interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

export type JsonParse = { ok: true; value: unknown } | { ok: false; error: JsonError };

/** 1-based line and column of a character offset. */
export function locate(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, Math.max(0, Math.min(position, text.length)));
  const lines = before.split("\n");
  return { line: lines.length, column: (lines[lines.length - 1] ?? "").length + 1 };
}

/** Browsers word JSON errors differently; pull out a location where the message gives one. */
export function parseJson(text: string): JsonParse {
  if (text.trim() === "") return { ok: false, error: { message: "Enter some JSON to check." } };
  if (text.length > MAX_JSON_CHARS) return { ok: false, error: { message: "That input is too large. The limit is 5 million characters." } };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON.";
    const lineColumn = /line (\d+) column (\d+)/i.exec(message);
    if (lineColumn) return { ok: false, error: { message, line: Number(lineColumn[1]), column: Number(lineColumn[2]) } };
    const position = /position (\d+)/i.exec(message);
    if (position) return { ok: false, error: { message, ...locate(text, Number(position[1])) } };
    return { ok: false, error: { message } };
  }
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export type Indent = "2" | "4" | "tab";

export function formatJson(value: unknown, indent: Indent, sort: boolean): string {
  return JSON.stringify(sort ? sortKeys(value) : value, null, indent === "tab" ? "\t" : Number(indent));
}

export function minifyJson(value: unknown, sort: boolean): string {
  return JSON.stringify(sort ? sortKeys(value) : value);
}
