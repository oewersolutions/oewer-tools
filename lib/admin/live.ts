import { cellString, toRows, type Row } from "./table";
import { schema } from "../workbook";
import type { WorkbookData } from "../workbook/types";

/** What saving would change on the live site, in words, by comparing the workbook before and after. */
export interface LiveChanges {
  /** Things that become visible. */
  appear: string[];
  /** Things that stop being visible. */
  disappear: string[];
  /** Visible things whose content changes. */
  edited: string[];
}

interface Kind {
  sheet: string;
  label: string;
  name: string;
  /** Whether the item is on the site. */
  live: (r: Row) => boolean;
  /** Everything that makes up the item's page, to tell whether it was edited. */
  fingerprint: (r: Row, data: WorkbookData) => string;
}

const rowText = (r: Row) => JSON.stringify(Object.entries(r.values).map(([k, v]) => [k, cellString(v)]));
const childrenText = (data: WorkbookData, sheet: string, column: string, id: string) =>
  JSON.stringify(toRows(data, sheet, schema.sheets[sheet]!).filter((c) => cellString(c.values[column]) === id).map(rowText).sort());
const seoText = (data: WorkbookData, id: string) => JSON.stringify(toRows(data, "seo_metadata", schema.sheets.seo_metadata!).filter((c) => cellString(c.values.entity_id) === id).map(rowText));

const KINDS: Kind[] = [
  { sheet: "posts", label: "article", name: "title", live: (r) => r.values.status === "published", fingerprint: (r, d) => rowText(r) + childrenText(d, "post_blocks", "post_id", r.id) + childrenText(d, "post_tags", "post_id", r.id) + seoText(d, r.id) },
  { sheet: "tools", label: "tool", name: "name", live: (r) => r.values.status === "published", fingerprint: (r, d) => rowText(r) + childrenText(d, "tool_settings", "tool_id", r.id) + seoText(d, r.id) },
  { sheet: "pages", label: "page", name: "title", live: (r) => r.values.status === "published", fingerprint: (r, d) => rowText(r) + seoText(d, r.id) },
  { sheet: "tool_categories", label: "tool category", name: "name", live: (r) => r.values.enabled === true, fingerprint: (r, d) => rowText(r) + seoText(d, r.id) },
  { sheet: "blog_categories", label: "article category", name: "name", live: () => true, fingerprint: (r, d) => rowText(r) + seoText(d, r.id) },
];

export function liveChanges(before: WorkbookData, after: WorkbookData): LiveChanges {
  const out: LiveChanges = { appear: [], disappear: [], edited: [] };
  for (const kind of KINDS) {
    const def = schema.sheets[kind.sheet]!;
    const was = new Map(toRows(before, kind.sheet, def).map((r) => [r.id, r]));
    const now = new Map(toRows(after, kind.sheet, def).map((r) => [r.id, r]));
    for (const [id, row] of now) {
      const previous = was.get(id);
      const text = `${kind.label} “${cellString(row.values[kind.name])}”`;
      const isLive = kind.live(row);
      const wasLive = previous ? kind.live(previous) : false;
      if (isLive && !wasLive) out.appear.push(text);
      else if (isLive && previous && kind.fingerprint(row, after) !== kind.fingerprint(previous, before)) out.edited.push(text);
      else if (!isLive && wasLive) out.disappear.push(text);
    }
    for (const [id, row] of was) if (!now.has(id) && kind.live(row)) out.disappear.push(`${kind.label} “${cellString(row.values[kind.name])}”`);
  }
  return out;
}

export const hasLiveChanges = (c: LiveChanges) => c.appear.length + c.disappear.length + c.edited.length > 0;
