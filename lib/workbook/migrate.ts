import type { Issue, WorkbookData } from "./types";

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(text: unknown): Version | null {
  const match = typeof text === "string" ? /^(\d+)\.(\d+)\.(\d+)$/.exec(text) : null;
  return match ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) } : null;
}

/** Negative when a < b, 0 when equal, positive when a > b. */
export function compareVersions(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * Old-shaped workbook as read leniently by header name, with no schema checks.
 * Migrations operate on this because an old workbook's columns may not match the current schema.
 */
export interface RawWorkbook {
  sheets: Record<string, { headers: string[]; rows: Record<string, unknown>[] }>;
}

export interface Migration {
  from: string;
  to: string;
  description: string;
  up(workbook: RawWorkbook): void;
}

/**
 * Registered migrations, oldest first. Empty while the schema is still 1.0.0.
 * See docs/schema-versioning.md for how to add one.
 */
export const migrations: Migration[] = [];

/** Ordered chain of migrations from `from` to `to`, or null when no chain exists. */
export function planMigrations(from: string, to: string, available: Migration[] = migrations): Migration[] | null {
  const chain: Migration[] = [];
  let current = from;
  while (current !== to) {
    const next = available.find((m) => m.from === current);
    if (!next || chain.length > available.length) return null;
    chain.push(next);
    current = next.to;
  }
  return chain;
}

export function applyMigrations(workbook: RawWorkbook, chain: Migration[]): void {
  for (const migration of chain) migration.up(workbook);
}

/** The schema_version stored in site_settings, or null when absent. */
export function readWorkbookVersion(data: WorkbookData): string | null {
  const row = (data.site_settings ?? []).find((r) => r.values.setting_key === "schema_version");
  return row && typeof row.values.setting_value === "string" ? row.values.setting_value : null;
}

/** Compare the workbook's schema_version with the code's. Returns an issue when they are not compatible. */
export function checkWorkbookVersion(
  data: WorkbookData,
  codeVersion: string,
  available: Migration[] = migrations,
): Issue | null {
  const found = readWorkbookVersion(data);
  const issue = (message: string): Issue => ({
    sheet: "site_settings",
    column: "setting_value",
    code: "schema_version_mismatch",
    message,
  });

  if (found === null) return null; // a missing schema_version is reported by the required-setting check
  const have = parseVersion(found);
  const want = parseVersion(codeVersion);
  if (!have) return issue(`schema_version '${found}' is not a valid x.y.z version.`);
  if (!want) throw new Error(`Code schema version '${codeVersion}' is not a valid x.y.z version.`);

  const diff = compareVersions(have, want);
  if (diff === 0) return null;
  if (diff > 0) {
    return issue(`Workbook schema ${found} is newer than this site's schema ${codeVersion}. Update the site code first.`);
  }
  return planMigrations(found, codeVersion, available)
    ? issue(`Workbook schema ${found} is older than ${codeVersion}. A migration is available; see docs/schema-versioning.md.`)
    : issue(`Workbook schema ${found} is older than ${codeVersion} and no migration path exists; see docs/schema-versioning.md.`);
}
