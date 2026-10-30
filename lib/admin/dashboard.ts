import type { WorkbookData } from "../workbook";

export interface CountRow {
  label: string;
  published: number;
  draft: number;
  archived: number;
  total: number;
}

/** How much content the workbook holds, by status, for the admin dashboard. */
export function contentCounts(data: WorkbookData): CountRow[] {
  const byStatus = (label: string, sheet: string): CountRow => {
    const rows = data[sheet] ?? [];
    const n = (status: string) => rows.filter((r) => r.values.status === status).length;
    return { label, published: n("published"), draft: n("draft"), archived: n("archived"), total: rows.length };
  };
  return [byStatus("Tools", "tools"), byStatus("Articles", "posts"), byStatus("Pages", "pages")];
}

/** Sheets that have no status, shown as plain totals. */
export function plainCounts(data: WorkbookData): { label: string; total: number }[] {
  const count = (sheet: string) => (data[sheet] ?? []).length;
  return [
    { label: "Tool categories", total: count("tool_categories") },
    { label: "Article categories", total: count("blog_categories") },
    { label: "Tags", total: count("tags") },
    { label: "Authors", total: count("authors") },
    { label: "Redirects", total: count("redirects") },
  ];
}
