import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkBuild } from "../lib/check-build";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

// The deploy workflow only publishes when every step before it succeeds. These tests prove the steps really do fail,
// with a non-zero exit code, for the kinds of bad input that could reach the main branch.
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "oewer-failures-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const run = (script: string, ...args: string[]) => spawnSync("npx", ["tsx", script, ...args], { encoding: "utf-8", cwd: process.cwd() });

describe("a bad workbook stops the build", () => {
  let good: string;
  beforeAll(async () => {
    good = join(dir, "good.xlsx");
    await buildSeedWorkbook(good);
  });

  /** A copy of the workbook with one cell changed. */
  async function broken(name: string, sheet: string, column: string, value: string): Promise<string> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(good);
    const ws = wb.getWorksheet(sheet)!;
    const col = ws.getRow(1).values as string[];
    ws.getRow(2).getCell(col.indexOf(column)).value = value;
    const file = join(dir, name);
    await wb.xlsx.writeFile(file);
    return file;
  }

  it("a valid workbook passes validation and export", () => {
    expect(run("scripts/validate-workbook.ts", good).status).toBe(0);
    const out = join(dir, "ok.json");
    expect(run("scripts/export-content.ts", good, out).status).toBe(0);
    expect(existsSync(out)).toBe(true);
  });

  for (const [label, sheet, column, value] of [
    ["an invalid address", "pages", "slug", "Not A Slug!"],
    ["a reference to something that does not exist", "tools", "category_id", "TCAT9999"],
    ["a tool with no component", "tools", "component_key", "not-a-real-tool"],
    ["an unusable status", "posts", "status", "maybe"],
  ] as const) {
    it(`${label} fails validation and writes no export`, async () => {
      const file = await broken(`bad-${column}.xlsx`, sheet, column, value);
      const validate = run("scripts/validate-workbook.ts", file);
      expect(validate.status, validate.stderr).toBe(1);
      const out = join(dir, `bad-${column}.json`);
      const exported = run("scripts/export-content.ts", file, out);
      expect(exported.status).toBe(1);
      expect(exported.stderr).toMatch(/Not exporting/);
      expect(existsSync(out)).toBe(false); // nothing for the site build to pick up
    });
  }

  it("a file that is not a workbook fails", () => {
    const file = join(dir, "garbage.xlsx");
    writeFileSync(file, "this is not a spreadsheet");
    expect(run("scripts/validate-workbook.ts", file).status).not.toBe(0);
    expect(run("scripts/export-content.ts", file, join(dir, "garbage.json")).status).not.toBe(0);
  });

  it("a missing workbook fails", () => {
    expect(run("scripts/validate-workbook.ts", join(dir, "nope.xlsx")).status).not.toBe(0);
  });
});

describe("test builds are refused in the deploy workflow", () => {
  it("preview switches stop an export that claims to be the deploy workflow", () => {
    for (const name of ["OEWER_PREVIEW_DRAFTS", "OEWER_PREVIEW_ALL_TOOLS", "OEWER_PREVIEW_ADS"]) {
      const result = spawnSync("npx", ["tsx", "scripts/export-content.ts", "data/oewer_database.xlsx", join(dir, `${name}.json`)], {
        encoding: "utf-8",
        env: { ...process.env, [name]: "1", GITHUB_WORKFLOW: "Deploy to GitHub Pages" },
      });
      expect(result.status, name).toBe(1);
      expect(result.stderr, name).toContain("must never be set for a deploy build");
    }
  });
});

describe("checkBuild", () => {
  function site(files: Record<string, string>): string {
    const root = mkdtempSync(join(dir, "site-"));
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(join(root, file, ".."), { recursive: true });
      writeFileSync(join(root, file), content);
    }
    return root;
  }
  const sitemap = (paths: string[]) => `<urlset>${paths.map((p) => `<url><loc>https://example.com${p}</loc></url>`).join("")}</urlset>`;
  const GOOD = {
    "index.html": "<html><head><title>Home</title></head><body><h1>Home</h1></body></html>",
    "404.html": "<html></html>",
    "robots.txt": "User-agent: *",
    "feed.xml": "<rss/>",
    "tools/index.html": "<html></html>",
    "admin/index.html": '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"></head></html>',
    "sitemap.xml": sitemap(["/", "/tools/", "/tools/a/b/"]),
    "tools/a/b/index.html": "<html></html>",
  };

  it("passes a complete build", () => {
    expect(checkBuild(site(GOOD))).toEqual([]);
  });
  it("catches a missing core file", () => {
    const { "robots.txt": _omitted, ...rest } = GOOD;
    void _omitted;
    expect(checkBuild(site(rest))).toEqual(["Missing robots.txt."]);
  });
  it("catches an empty-looking site", () => {
    const problems = checkBuild(site({ ...GOOD, "sitemap.xml": sitemap(["/"]) }));
    expect(problems.join(" ")).toMatch(/only 1 page/);
    expect(problems.join(" ")).toMatch(/no tool pages/);
  });
  it("catches a sitemap page that was not built", () => {
    expect(checkBuild(site({ ...GOOD, "sitemap.xml": sitemap(["/", "/tools/", "/tools/a/b/", "/blog/x/"]) })).join(" ")).toMatch(/\/blog\/x\/ but the build has no page/);
  });
  it("catches a home page with no title or heading", () => {
    const problems = checkBuild(site({ ...GOOD, "index.html": "<html><body>hi</body></html>" })).join(" ");
    expect(problems).toMatch(/no title/);
    expect(problems).toMatch(/no main heading/);
  });
  it("refuses an admin page without its security policy", () => {
    expect(checkBuild(site({ ...GOOD, "admin/index.html": "<html></html>" })).join(" ")).toMatch(/no Content Security Policy/);
  });
  it("refuses a test build with preview ad boxes", () => {
    expect(checkBuild(site({ ...GOOD, "tools/a/b/index.html": "<html><span>Ad space (preview)</span></html>" })).join(" ")).toMatch(/preview ad boxes/);
  });
  it("understands a base path such as /oewer-tools", () => {
    const map = sitemap(["/oewer-tools/", "/oewer-tools/tools/", "/oewer-tools/tools/a/b/"]).replaceAll("https://example.com", "https://example.com");
    expect(checkBuild(site({ ...GOOD, "sitemap.xml": map }), "/oewer-tools")).toEqual([]);
    expect(readFileSync(join(site({ ...GOOD }), "index.html"), "utf-8")).toContain("Home");
  });
});
