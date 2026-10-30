import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyticsInfo, contentCounts, plainCounts } from "../lib/admin/dashboard";
import { isDashboardUrl } from "../lib/analytics";
import { checkWorkbook } from "../lib/workbook";
import type { WorkbookData } from "../lib/workbook";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

let dir: string;
let data: WorkbookData;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-dash-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  const bytes = new Uint8Array(await readFile(file));
  data = (await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.length)).data!;
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe("dashboard counts", () => {
  it("counts tools, articles and pages by status; every row is counted once", () => {
    const [tools, posts, pages] = contentCounts(data);
    expect([tools!.label, posts!.label, pages!.label]).toEqual(["Tools", "Articles", "Pages"]);
    expect(tools!.total).toBe(data.tools!.length);
    expect(posts!.total).toBe(data.posts!.length);
    for (const c of contentCounts(data)) expect(c.published + c.draft + c.archived).toBe(c.total);
    expect(tools!.published).toBe(data.tools!.filter((r) => r.values.status === "published").length);
  });
  it("copes with missing sheets", () => {
    expect(contentCounts({}).every((c) => c.total === 0)).toBe(true);
    expect(plainCounts({}).every((c) => c.total === 0)).toBe(true);
  });
  it("totals the sheets that have no status", () => {
    expect(plainCounts(data).find((c) => c.label === "Tags")!.total).toBe(data.tags!.length);
  });
});

describe("analytics on the dashboard", () => {
  const withSettings = (id: string, url: string): WorkbookData => {
    const copy = structuredClone(data);
    for (const [key, value] of [["analytics_measurement_id", id], ["analytics_dashboard_url", url]] as const) {
      const row = copy.site_settings!.find((r) => r.values.setting_key === key);
      if (row) row.values.setting_value = value;
      else copy.site_settings!.push({ row: 99, values: { setting_key: key, setting_value: value } });
    }
    return copy;
  };
  it("is off with no link when nothing is set", () => {
    expect(analyticsInfo(data)).toEqual({ enabled: false, measurementId: "", dashboardUrl: "" });
    expect(analyticsInfo({})).toEqual({ enabled: false, measurementId: "", dashboardUrl: "" });
  });
  it("reports the ID and the reports link when both are valid", () => {
    expect(analyticsInfo(withSettings("G-ABC123XYZ4", "https://lookerstudio.google.com/x"))).toEqual({ enabled: true, measurementId: "G-ABC123XYZ4", dashboardUrl: "https://lookerstudio.google.com/x" });
  });
  it("ignores values that are not safe or valid", () => {
    expect(analyticsInfo(withSettings("nope", "javascript:alert(1)"))).toEqual({ enabled: false, measurementId: "", dashboardUrl: "" });
  });
});

describe("isDashboardUrl", () => {
  it("accepts full https addresses only", () => {
    expect(isDashboardUrl("https://analytics.google.com/analytics/web/#/p123/reports")).toBe(true);
    for (const bad of ["", "http://analytics.google.com", "javascript:alert(1)", "data:text/html,x", "https://localhost", "analytics.google.com", "//evil.example"]) expect(isDashboardUrl(bad), bad).toBe(false);
  });
});
