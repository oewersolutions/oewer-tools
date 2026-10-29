import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { checkWorkbook, schema } from "../lib/workbook";
import {
  applyMigrations,
  checkWorkbookVersion,
  compareVersions,
  migrations,
  parseVersion,
  planMigrations,
  readWorkbookVersion,
  type Migration,
  type RawWorkbook,
} from "../lib/workbook/migrate";
import type { WorkbookData } from "../lib/workbook";

const dataWithVersion = (version: string): WorkbookData => ({
  site_settings: [{ row: 2, values: { setting_key: "schema_version", setting_value: version } }],
});

const step = (from: string, to: string, up: Migration["up"] = () => {}): Migration => ({
  from,
  to,
  description: `${from} to ${to}`,
  up,
});

describe("versions", () => {
  it("parses x.y.z and rejects anything else", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    for (const bad of ["1.2", "v1.2.3", "1.2.x", "", null, 3]) expect(parseVersion(bad)).toBeNull();
  });

  it("compares numerically, not as text", () => {
    const v = (s: string) => parseVersion(s)!;
    expect(compareVersions(v("1.10.0"), v("1.9.0"))).toBeGreaterThan(0);
    expect(compareVersions(v("2.0.0"), v("1.99.99"))).toBeGreaterThan(0);
    expect(compareVersions(v("1.0.0"), v("1.0.0"))).toBe(0);
  });

  it("reads the workbook version from site_settings", () => {
    expect(readWorkbookVersion(dataWithVersion("1.0.0"))).toBe("1.0.0");
    expect(readWorkbookVersion({ site_settings: [] })).toBeNull();
  });
});

describe("checkWorkbookVersion", () => {
  it("accepts a matching version", () => {
    expect(checkWorkbookVersion(dataWithVersion("1.0.0"), "1.0.0")).toBeNull();
  });

  it("rejects a malformed version", () => {
    expect(checkWorkbookVersion(dataWithVersion("one"), "1.0.0")?.code).toBe("schema_version_mismatch");
  });

  it("rejects a workbook newer than the code", () => {
    expect(checkWorkbookVersion(dataWithVersion("1.1.0"), "1.0.0")?.message).toMatch(/newer/);
  });

  it("says when an older workbook has no migration path", () => {
    expect(checkWorkbookVersion(dataWithVersion("0.9.0"), "1.0.0", [])?.message).toMatch(/no migration path/);
  });

  it("says when an older workbook has a migration available", () => {
    const issue = checkWorkbookVersion(dataWithVersion("0.9.0"), "1.0.0", [step("0.9.0", "1.0.0")]);
    expect(issue?.message).toMatch(/migration is available/);
  });
});

describe("planMigrations", () => {
  const all = [step("1.0.0", "1.1.0"), step("1.1.0", "1.2.0"), step("2.0.0", "2.1.0")];

  it("returns an empty plan when versions are equal", () => {
    expect(planMigrations("1.0.0", "1.0.0", all)).toEqual([]);
  });

  it("chains migrations in order", () => {
    expect(planMigrations("1.0.0", "1.2.0", all)?.map((m) => m.to)).toEqual(["1.1.0", "1.2.0"]);
  });

  it("returns null when there is no path", () => {
    expect(planMigrations("1.0.0", "2.1.0", all)).toBeNull();
    expect(planMigrations("0.1.0", "1.0.0", all)).toBeNull();
  });

  it("does not loop forever on a cyclic registry", () => {
    expect(planMigrations("1.0.0", "3.0.0", [step("1.0.0", "1.1.0"), step("1.1.0", "1.0.0")])).toBeNull();
  });

  it("applies migrations in order to a raw workbook", () => {
    const wb: RawWorkbook = { sheets: { tools: { headers: ["tool_id"], rows: [{ tool_id: "TOOL0001" }] } } };
    const chain = [
      step("1.0.0", "1.1.0", (w) => {
        w.sheets.tools!.headers.push("icon");
        for (const r of w.sheets.tools!.rows) r.icon = "";
      }),
      step("1.1.0", "1.2.0", (w) => {
        for (const r of w.sheets.tools!.rows) r.icon = "wrench";
      }),
    ];
    applyMigrations(wb, chain);
    expect(wb.sheets.tools!.headers).toEqual(["tool_id", "icon"]);
    expect(wb.sheets.tools!.rows[0]).toEqual({ tool_id: "TOOL0001", icon: "wrench" });
  });
});

describe("integration", () => {
  it("keeps the code's schema_version a valid version and the registry consistent with it", () => {
    expect(parseVersion(schema.schema_version)).not.toBeNull();
    if (migrations.length > 0) expect(migrations[migrations.length - 1]!.to).toBe(schema.schema_version);
  });

  it("reports no version mismatch for the committed workbook", async () => {
    const buf = await readFile(new URL("../data/oewer_database.xlsx", import.meta.url));
    const ok = await checkWorkbook(buf as unknown as ArrayBuffer, buf.byteLength);
    expect(ok.issues.some((i) => i.code === "schema_version_mismatch")).toBe(false);
  });
});
