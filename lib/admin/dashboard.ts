import { isDashboardUrl, isMeasurementId } from "../analytics";
import { prevDay } from "../games/puzzles";
import { stockFrom } from "../games/make";
import type { Change } from "./changes";
import { ARCADE_GAME_TYPES, type GameType } from "../games/types";
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

/** Fewer days of ready puzzles than this is shown as a warning. */
export const LOW_PUZZLE_STOCK = 5;

export interface PuzzleStock {
  game: string;
  /** Days in a row, starting today, that have a published puzzle. */
  days: number;
  /** The first day that has none, as YYYY-MM-DD. */
  nextMissing: string;
  tone: "good" | "warn" | "bad";
}

/** For each published game, how many days of puzzles are ready from `today` (YYYY-MM-DD). None today is "bad", fewer than 5 is "warn". */
export function puzzleStock(data: WorkbookData, today: string): PuzzleStock[] {
  const puzzles = data.game_puzzles ?? [];
  return (data.games ?? [])
    .filter((g) => g.values.status === "published" && !ARCADE_GAME_TYPES.includes(g.values.game_type as GameType))
    .sort((a, b) => Number(a.values.sort_order) - Number(b.values.sort_order))
    .map((g) => {
      const dates = new Set(puzzles.filter((p) => p.values.game_id === g.values.game_id && p.values.status === "published").map((p) => String(p.values.puzzle_date)));
      const { days, nextMissing } = stockFrom(dates, today);
      return { game: String(g.values.name), days, nextMissing, tone: days === 0 ? "bad" : days < LOW_PUZZLE_STOCK ? "warn" : "good" };
    });
}

/**
 * Changes that delete the daily puzzles of earlier days. Yesterday is kept, because visitors west of the admin's time zone
 * are still on that date, and so is every puzzle from today on. Arcade games have none.
 */
export function oldPuzzleChanges(data: WorkbookData, today: string): Change[] {
  const keep = prevDay(today);
  return (data.game_puzzles ?? []).filter((p) => String(p.values.puzzle_date) < keep).map((p) => ({ type: "delete", sheet: "game_puzzles", pk: String(p.values.puzzle_id) }));
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
