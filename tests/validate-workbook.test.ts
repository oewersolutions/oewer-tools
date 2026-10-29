import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";
import { checkWorkbook, readWorkbook, schema, validateWorkbook } from "../lib/workbook";
import type { Issue, WorkbookData } from "../lib/workbook";

let dir: string;
let seedBuffer: Buffer;
let baseline: WorkbookData;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-validate-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  seedBuffer = await readFile(file);
  baseline = (await readWorkbook(seedBuffer as unknown as ArrayBuffer, schema)).data;
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** Clone the valid baseline, apply a mutation, and return the validation issues. */
function validateWith(mutate: (d: WorkbookData) => void): Issue[] {
  const data = structuredClone(baseline);
  mutate(data);
  return validateWorkbook(data, schema);
}
const row = (d: WorkbookData, sheet: string, index = 0) => d[sheet]![index]!;
const has = (issues: Issue[], code: string, sheet: string, column?: string) =>
  issues.some((i) => i.code === code && i.sheet === sheet && (column === undefined || i.column === column));

describe("valid workbook", () => {
  it("passes with no issues", async () => {
    const result = await checkWorkbook(seedBuffer as unknown as ArrayBuffer, seedBuffer.byteLength);
    expect(result.issues).toEqual([]);
  });

  it("is rejected when larger than the size limit", async () => {
    const result = await checkWorkbook(seedBuffer as unknown as ArrayBuffer, schema.limits.max_workbook_bytes + 1);
    expect(result.issues[0]?.code).toBe("too_large");
  });
});

describe("required fields, types and enums", () => {
  it("rejects a missing required field", () => {
    const issues = validateWith((d) => (row(d, "tools").values.name = ""));
    expect(has(issues, "required", "tools", "name")).toBe(true);
  });

  it("rejects an id that does not match its pattern", () => {
    const issues = validateWith((d) => (row(d, "tools").values.tool_id = "T1"));
    expect(has(issues, "invalid_value", "tools", "tool_id")).toBe(true);
  });

  it("rejects an invalid enum value", () => {
    const issues = validateWith((d) => (row(d, "posts").values.status = "live"));
    expect(has(issues, "invalid_value", "posts", "status")).toBe(true);
  });

  it("rejects a non-integer sort_order and a text boolean", () => {
    const issues = validateWith((d) => {
      row(d, "tools").values.sort_order = 1.5;
      row(d, "tools").values.featured = "yes";
    });
    expect(has(issues, "invalid_value", "tools", "sort_order")).toBe(true);
    expect(has(issues, "invalid_value", "tools", "featured")).toBe(true);
  });

  it("rejects bad slugs and non-UTC timestamps", () => {
    const issues = validateWith((d) => {
      row(d, "tools").values.slug = "Bad Slug";
      row(d, "posts").values.updated_at = "29/10/2026";
    });
    expect(has(issues, "invalid_value", "tools", "slug")).toBe(true);
    expect(has(issues, "invalid_value", "posts", "updated_at")).toBe(true);
  });

  it("rejects values over the length limit", () => {
    const issues = validateWith((d) => (row(d, "tools").values.name = "x".repeat(schema.limits.max_string_length + 1)));
    expect(has(issues, "invalid_value", "tools", "name")).toBe(true);
  });
});

describe("uniqueness", () => {
  it("rejects duplicate IDs", () => {
    const issues = validateWith((d) => (row(d, "tools", 1).values.tool_id = row(d, "tools", 0).values.tool_id));
    expect(has(issues, "duplicate", "tools", "tool_id")).toBe(true);
  });

  it("rejects duplicate slugs", () => {
    const issues = validateWith((d) => (row(d, "tools", 1).values.slug = row(d, "tools", 0).values.slug));
    expect(has(issues, "duplicate", "tools", "slug")).toBe(true);
  });

  it("rejects duplicate combinations (post_tags)", () => {
    const issues = validateWith((d) => {
      row(d, "post_tags", 1).values.tag_id = row(d, "post_tags", 0).values.tag_id;
    });
    expect(has(issues, "duplicate", "post_tags")).toBe(true);
  });
});

describe("references", () => {
  it("rejects a broken foreign key", () => {
    const issues = validateWith((d) => (row(d, "tools").values.category_id = "TCAT9999"));
    expect(has(issues, "broken_reference", "tools", "category_id")).toBe(true);
  });

  it("rejects a seo_metadata row pointing at a missing entity", () => {
    const issues = validateWith((d) => (row(d, "seo_metadata").values.entity_id = "TOOL9999"));
    expect(has(issues, "broken_reference", "seo_metadata", "entity_id")).toBe(true);
  });

  it("rejects a missing required site setting", () => {
    const issues = validateWith((d) => (d.site_settings = d.site_settings!.filter((r) => r.values.setting_key !== "site_name")));
    expect(has(issues, "missing_setting", "site_settings")).toBe(true);
  });
});

describe("unsafe content", () => {
  it("rejects formula-like text", () => {
    const issues = validateWith((d) => (row(d, "tools").values.name = "=HYPERLINK(\"http://evil\")"));
    expect(has(issues, "invalid_value", "tools", "name")).toBe(true);
  });

  it("allows negative numbers stored as text", () => {
    const issues = validateWith((d) => {
      row(d, "tool_settings").values.setting_value = "-5";
      row(d, "tool_settings").values.value_type = "int";
    });
    expect(issues).toEqual([]);
  });

  it("rejects HTML in text fields", () => {
    const issues = validateWith((d) => (row(d, "post_blocks").values.content = "Hello <script>alert(1)</script>"));
    expect(has(issues, "invalid_value", "post_blocks", "content")).toBe(true);
  });

  it("rejects unsafe URL schemes and insecure external links", () => {
    const issues = validateWith((d) => {
      row(d, "navigation", 0).values.url = "javascript:alert(1)";
      row(d, "navigation", 1).values.url = "http://example.com";
      row(d, "navigation", 2).values.url = "//evil.example";
    });
    expect(issues.filter((i) => i.sheet === "navigation" && i.column === "url")).toHaveLength(3);
  });

  it("accepts https and site-relative URLs", () => {
    const issues = validateWith((d) => {
      row(d, "navigation", 0).values.url = "https://example.com/page";
      row(d, "navigation", 1).values.url = "/blog";
    });
    expect(issues).toEqual([]);
  });

  it("rejects path traversal in paths", () => {
    const issues = validateWith((d) => (row(d, "authors").values.avatar_path = "/assets/../secret.png"));
    expect(has(issues, "invalid_value", "authors", "avatar_path")).toBe(true);
  });

  it("rejects a reserved page slug", () => {
    const issues = validateWith((d) => (row(d, "pages").values.slug = "admin"));
    expect(has(issues, "reserved_slug", "pages", "slug")).toBe(true);
  });

  it("rejects a malformed ad unit id", () => {
    const issues = validateWith((d) => (row(d, "advertisements").values.ad_unit_id = "ca-pub-secret"));
    expect(has(issues, "invalid_value", "advertisements", "ad_unit_id")).toBe(true);
  });
});

describe("content rules", () => {
  it("requires published_at and blocks for published posts", () => {
    const noDate = validateWith((d) => (row(d, "posts").values.published_at = ""));
    expect(has(noDate, "required", "posts", "published_at")).toBe(true);

    const noBlocks = validateWith((d) => (d.post_blocks = []));
    expect(has(noBlocks, "no_content", "posts")).toBe(true);
  });

  it("requires asset_path for image blocks and content for others", () => {
    const issues = validateWith((d) => {
      row(d, "post_blocks", 0).values.block_type = "image";
      row(d, "post_blocks", 0).values.asset_path = "";
      row(d, "post_blocks", 1).values.content = "";
    });
    expect(has(issues, "required", "post_blocks", "asset_path")).toBe(true);
    expect(has(issues, "required", "post_blocks", "content")).toBe(true);
  });

  it("checks value_type consistency", () => {
    const issues = validateWith((d) => {
      row(d, "tool_settings").values.value_type = "int";
      row(d, "tool_settings").values.setting_value = "lots";
    });
    expect(has(issues, "invalid_value", "tool_settings", "setting_value")).toBe(true);
  });

  it("rejects self redirects and redirect chains", () => {
    const self = validateWith((d) => {
      row(d, "redirects").values.enabled = true;
      row(d, "redirects").values.target_path = row(d, "redirects").values.source_path;
    });
    expect(has(self, "redirect_loop", "redirects")).toBe(true);

    const chain = validateWith((d) => {
      row(d, "redirects").values.enabled = true;
      d.redirects!.push({
        row: 3,
        values: { redirect_id: "RED0002", source_path: "/final", target_path: "/elsewhere", redirect_type: "301", enabled: true },
      });
      row(d, "redirects").values.target_path = "/final";
    });
    expect(has(chain, "redirect_chain", "redirects")).toBe(true);
  });
});

describe("reading the .xlsx file", () => {
  async function build(mutate: (wb: ExcelJS.Workbook) => void): Promise<Issue[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(seedBuffer as unknown as ArrayBuffer);
    mutate(wb);
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    return (await readWorkbook(buf, schema)).issues;
  }
  const codes = (issues: Issue[]) => issues.map((i) => i.code);

  it("reports a formula cell", async () => {
    const issues = await build((wb) => {
      wb.getWorksheet("tools")!.getCell("C2").value = { formula: "1+1", result: 2 };
    });
    expect(codes(issues)).toContain("formula");
  });

  it("reports a hyperlink cell", async () => {
    const issues = await build((wb) => {
      wb.getWorksheet("tools")!.getCell("C2").value = { text: "x", hyperlink: "https://example.com" };
    });
    expect(codes(issues)).toContain("hyperlink");
  });

  it("reports a changed header", async () => {
    const issues = await build((wb) => {
      wb.getWorksheet("tools")!.getCell("A1").value = "id";
    });
    expect(codes(issues)).toContain("header_mismatch");
  });

  it("reports a missing and an unknown sheet", async () => {
    const issues = await build((wb) => {
      wb.removeWorksheet(wb.getWorksheet("tags")!.id);
      wb.addWorksheet("scratch");
    });
    expect(codes(issues)).toEqual(expect.arrayContaining(["missing_sheet", "unknown_sheet"]));
  });

  it("reports hidden sheets and merged cells", async () => {
    const issues = await build((wb) => {
      wb.getWorksheet("tags")!.state = "hidden";
      wb.getWorksheet("authors")!.mergeCells("A2:B2");
    });
    expect(codes(issues)).toEqual(expect.arrayContaining(["hidden_sheet", "merged_cells"]));
  });

  it("reports data outside the schema's columns", async () => {
    const issues = await build((wb) => {
      wb.getWorksheet("tags")!.getCell("Z2").value = "stray";
    });
    expect(codes(issues)).toContain("extra_column");
  });

  it("reports a file that is not an xlsx", async () => {
    const result = await readWorkbook(Buffer.from("not a workbook") as unknown as ArrayBuffer, schema);
    expect(codes(result.issues)).toEqual(["unreadable"]);
  });
});

describe("tool component registry", () => {
  const publish = (d: WorkbookData) => (row(d, "tools").values.status = "published");
  const run = (keys: string[], mutate: (d: WorkbookData) => void) => {
    const data = structuredClone(baseline);
    mutate(data);
    return validateWorkbook(data, schema, { toolComponentKeys: keys });
  };

  it("rejects a published tool whose component_key is not registered", () => {
    expect(has(run([], publish), "unknown_component", "tools", "component_key")).toBe(true);
  });

  it("accepts a published tool whose component_key is registered", () => {
    expect(run(["image-compressor"], publish)).toEqual([]);
  });

  it("ignores draft tools", () => {
    expect(run([], () => undefined)).toEqual([]);
  });
});
