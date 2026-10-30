import { isDashboardUrl, isMeasurementId } from "../analytics";
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

export interface AnalyticsInfo {
  /** True when a valid Measurement ID is set, so the site can send analytics (after a visitor consents). */
  enabled: boolean;
  measurementId: string;
  /** A valid https address of the reports, or "" when not set (or not valid). */
  dashboardUrl: string;
}

export function analyticsInfo(data: WorkbookData): AnalyticsInfo {
  const setting = (key: string) => String((data.site_settings ?? []).find((r) => r.values.setting_key === key)?.values.setting_value ?? "").trim();
  const measurementId = setting("analytics_measurement_id");
  const url = setting("analytics_dashboard_url");
  return { enabled: isMeasurementId(measurementId), measurementId: isMeasurementId(measurementId) ? measurementId : "", dashboardUrl: isDashboardUrl(url) ? url : "" };
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
