import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyChanges, type Change } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { EMPTY_SEO, mergeChanges, planAds, planPost, planRows, planSeo, planToolContent, readAds, readPost, readSeo, readToolContent, type PostForm } from "../lib/admin/forms";
import { toRows } from "../lib/admin/table";
import { checkWorkbook, schema } from "../lib/workbook";
import type { WorkbookData } from "../lib/workbook";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

let dir: string;
let seed: Uint8Array;
let data: WorkbookData;
const NOW = "2026-11-01T10:00:00Z";

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-forms-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  seed = new Uint8Array(await readFile(file));
  data = (await checkWorkbook(seed as unknown as ArrayBuffer, seed.length)).data;
});
afterAll(() => rm(dir, { recursive: true, force: true }));

/** Apply planned changes to the seed and return the resulting workbook's data and problems. */
async function after(changes: Change[]) {
  const wb = await loadWorkbook(seed);
  const result = applyChanges(wb, schema, changes);
  expect(result.conflicts).toEqual([]);
  const bytes = await saveWorkbook(wb);
  return checkWorkbook(bytes as unknown as ArrayBuffer, bytes.length);
}
const find = (d: WorkbookData, sheet: string, id: string) => toRows(d, sheet, schema.sheets[sheet]!).find((r) => r.id === id);

describe("planRows", () => {
  const rows = () => toRows(data, "tags", schema.sheets.tags!);
  it("adds, updates and deletes to match the desired rows", () => {
    const current = rows();
    const changes = planRows("tags", current, [{ tag_id: "TAG0001", name: "Loans!", slug: "loans" }, { tag_id: "TAG0099", name: "New", slug: "new" }]);
    expect(changes.filter((c) => c.type === "set")).toEqual([{ type: "set", sheet: "tags", pk: "TAG0001", column: "name", before: "Loans", after: "Loans!" }]);
    expect(changes.filter((c) => c.type === "add")).toHaveLength(1);
    expect(changes.filter((c) => c.type === "delete").length).toBe(current.length - 1);
  });
  it("keeps rows that are not mentioned when asked to", () => {
    expect(planRows("tags", rows(), [], true)).toEqual([]);
  });
});

describe("mergeChanges", () => {
  it("merges edits to the same cell and forgets a row added and deleted", () => {
    const set = (b: string, a: string): Change => ({ type: "set", sheet: "tags", pk: "TAG0001", column: "name", before: b, after: a });
    expect(mergeChanges(mergeChanges([], [set("A", "B")]), [set("B", "C")])).toEqual([set("A", "C")]);
    const add: Change = { type: "add", sheet: "tags", values: { tag_id: "TAG0099", name: "x", slug: "x" } };
    expect(mergeChanges(mergeChanges([], [add]), [{ type: "delete", sheet: "tags", pk: "TAG0099" }])).toEqual([]);
  });
  it("folds an edit of a row added in this session into the pending add", () => {
    const add: Change = { type: "add", sheet: "tags", values: { tag_id: "TAG0099", name: "x", slug: "x" } };
    expect(mergeChanges([add], [{ type: "set", sheet: "tags", pk: "TAG0099", column: "name", before: "x", after: "y" }])).toEqual([{ type: "add", sheet: "tags", values: { tag_id: "TAG0099", name: "y", slug: "x" } }]);
  });
});

describe("SEO", () => {
  it("reads an existing row and an absent one", () => {
    expect(readSeo(data, "tool", "TOOL0004").meta_title).toBe("EMI Calculator - Monthly Loan Payment");
    expect(readSeo(data, "tool", "TOOL0001")).toEqual(EMPTY_SEO);
  });
  it("creates a row for an entity that had none, and the workbook stays valid", async () => {
    const changes = planSeo(data, "tool", "TOOL0001", { meta_title: "Image Compressor - Free", meta_description: "Shrink images in your browser.", canonical_url: "", noindex: false });
    expect(changes).toHaveLength(1);
    const result = await after(changes);
    expect(result.issues).toEqual([]);
    expect(readSeo(result.data, "tool", "TOOL0001").meta_title).toBe("Image Compressor - Free");
  });
  it("updates only what changed, and removes the row when emptied", async () => {
    const form = { ...readSeo(data, "tool", "TOOL0004"), noindex: true };
    expect(planSeo(data, "tool", "TOOL0004", form)).toEqual([{ type: "set", sheet: "seo_metadata", pk: "SEO0001", column: "noindex", before: "false", after: "true" }]);
    expect(planSeo(data, "tool", "TOOL0004", readSeo(data, "tool", "TOOL0004"))).toEqual([]);
    const gone = await after(planSeo(data, "tool", "TOOL0004", EMPTY_SEO));
    expect(gone.issues).toEqual([]);
    expect(readSeo(gone.data, "tool", "TOOL0004")).toEqual(EMPTY_SEO);
  });
  it("rejects a title that is too long through validation, not silently", async () => {
    const result = await after(planSeo(data, "tool", "TOOL0001", { ...EMPTY_SEO, meta_title: "x".repeat(80), meta_description: "d" }));
    expect(result.issues.some((i) => i.sheet === "seo_metadata" && i.column === "meta_title")).toBe(true);
  });
});

describe("tool content", () => {
  it("reads the seeded help, examples, FAQ, related tools and guides", () => {
    const c = readToolContent(data, "TOOL0004");
    expect(c.help).toContain("How it is calculated");
    expect(c.examples.length).toBeGreaterThan(0);
    expect(c.faq[0]).toHaveProperty("q");
    expect(c.related).toEqual(["TOOL0005", "TOOL0007"]);
    expect(c.guides).toEqual(["POST0001"]);
  });
  it("plans nothing when the form is unchanged", () => {
    expect(planToolContent(data, "TOOL0004", readToolContent(data, "TOOL0004"))).toEqual([]);
  });
  it("changes one FAQ answer, adds a part that was missing, and removes an emptied one", async () => {
    const c = readToolContent(data, "TOOL0004");
    const form = { ...c, faq: c.faq.map((f, i) => (i === 0 ? { ...f, a: "A new answer." } : f)), related: [], guides: [...c.guides, "POST0003"] };
    const changes = planToolContent(data, "TOOL0004", form);
    expect(changes.filter((c) => c.type === "delete")).toHaveLength(1); // related removed
    const result = await after(changes);
    expect(result.issues).toEqual([]);
    const next = readToolContent(result.data, "TOOL0004");
    expect(next.faq[0]!.a).toBe("A new answer.");
    expect(next.related).toEqual([]);
    expect(next.guides).toEqual(["POST0001", "POST0003"]);
  });
  it("gives a tool with no content rows new ones", async () => {
    const result = await after(planToolContent(data, "TOOL0010", { help: "Type your text.", examples: [], faq: [], related: [], guides: [] }, undefined));
    expect(result.issues).toEqual([]);
  });
});

describe("articles", () => {
  const base = (): PostForm => ({ ...readPost(data, ""), title: "Saving on loan interest", slug: "saving-on-loan-interest", excerpt: "How to pay less interest.", category_id: "BCAT0001", author_id: "AUTH0001", status: "draft" });

  it("reads an article with its blocks in order and its tags", () => {
    const form = readPost(data, "POST0001");
    expect(form.title).toBe("How EMI Is Calculated");
    expect(form.blocks.map((b) => b.block_type)).toEqual(["paragraph", "heading", "paragraph", "heading", "list"]);
    expect(form.tagIds).toEqual(["TAG0001", "TAG0002"]);
  });

  it("creates a new article with blocks and tags, and the workbook stays valid", async () => {
    const form: PostForm = {
      ...base(),
      status: "published",
      tagIds: ["TAG0001"],
      newTags: ["Interest", "loans"], // "loans" already exists (case-insensitive) and must not be duplicated
      blocks: [
        { block_id: "", block_type: "paragraph", content: "Start with the basics.", asset_path: "" },
        { block_id: "", block_type: "heading", content: "Pay early", asset_path: "" },
        { block_id: "", block_type: "list", content: "One\nTwo", asset_path: "" },
      ],
    };
    const { changes, postId } = planPost(data, form, NOW);
    const result = await after(changes);
    expect(result.issues).toEqual([]);
    expect(postId).toBe("POST0007");
    const saved = readPost(result.data, postId);
    expect(saved.published_at).toBe(NOW); // a published article gets a date
    expect(saved.blocks.map((b) => b.content)).toEqual(["Start with the basics.", "Pay early", "One\nTwo"]);
    expect(toRows(result.data, "post_blocks", schema.sheets.post_blocks!).filter((r) => r.values.post_id === postId).map((r) => r.values.sort_order)).toEqual([1, 2, 3]);
    expect(saved.tagIds).toHaveLength(2);
    expect(toRows(result.data, "tags", schema.sheets.tags!).filter((t) => String(t.values.name).toLowerCase() === "loans")).toHaveLength(1);
    expect(toRows(result.data, "tags", schema.sheets.tags!).some((t) => t.values.name === "Interest" && t.values.slug === "interest")).toBe(true);
  });

  it("reorders, edits, adds and removes blocks of an existing article, and stamps the update date", async () => {
    const form = readPost(data, "POST0001");
    const [b1, b2, b3, b4, b5] = form.blocks;
    form.blocks = [b2!, { ...b1!, content: "Edited opening." }, { block_id: "", block_type: "callout", content: "A tip.", asset_path: "" }, b4!, b5!]; // b3 removed
    const { changes } = planPost(data, form, NOW);
    expect(b3).toBeDefined();
    const result = await after(changes);
    expect(result.issues).toEqual([]);
    const saved = readPost(result.data, "POST0001");
    expect(saved.blocks.map((b) => b.content)[0]).toBe(b2!.content);
    expect(saved.blocks.map((b) => b.content)[1]).toBe("Edited opening.");
    expect(saved.blocks).toHaveLength(5);
    expect(String(find(result.data, "posts", "POST0001")!.values.updated_at)).toBe(NOW);
  });

  it("plans nothing when nothing changed", () => {
    expect(planPost(data, readPost(data, "POST0001"), NOW).changes).toEqual([]);
  });

  it("detaches a tag and moves an article to archived", async () => {
    const form = { ...readPost(data, "POST0001"), tagIds: ["TAG0001"], status: "archived" };
    const result = await after(planPost(data, form, NOW).changes);
    expect(result.issues).toEqual([]);
    expect(readPost(result.data, "POST0001")).toMatchObject({ tagIds: ["TAG0001"], status: "archived" });
  });

  it("will not publish an article with no blocks (validation catches it)", async () => {
    const result = await after(planPost(data, { ...base(), status: "published", blocks: [] }, NOW).changes);
    expect(result.issues.some((i) => i.code === "no_content")).toBe(true);
  });
});

describe("advertisements", () => {
  it("reads placements and the site-wide switch", () => {
    const ads = readAds(data);
    expect(ads.adsEnabled).toBe(false);
    expect(ads.placements.map((p) => p.placement_key)).toEqual(["top_banner", "below_tool", "in_article", "mid_page", "list_bottom", "list_bottom"]);
  });
  it("turns ads on and enables one placement with its slot ID", async () => {
    const ads = readAds(data);
    ads.adsEnabled = true;
    ads.placements[0] = { ...ads.placements[0]!, enabled: true, ad_unit_id: "1234567890" };
    const result = await after(planAds(data, ads, NOW));
    expect(result.issues).toEqual([]);
    const next = readAds(result.data);
    expect(next.adsEnabled).toBe(true);
    expect(next.placements[0]).toMatchObject({ enabled: true, ad_unit_id: "1234567890" });
    expect(next.placements).toHaveLength(6);
  });
  it("rejects a placement the pages cannot show, and an enabled one with no slot number", async () => {
    const ads = readAds(data);
    ads.placements.push({ ad_id: "", placement_key: "sidebar", page_type: "home", enabled: true, ad_unit_id: "" });
    const issues = (await after(planAds(data, ads, NOW))).issues;
    expect(issues.some((i) => i.code === "unsupported_placement" && /Available: top_banner, mid_page/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.code === "missing_slot_id")).toBe(true);
  });
  it("rejects an ad unit ID that is not a public slot number", async () => {
    const ads = readAds(data);
    ads.placements[0] = { ...ads.placements[0]!, ad_unit_id: "ca-pub-abc" };
    expect((await after(planAds(data, ads, NOW))).issues.some((i) => i.column === "ad_unit_id")).toBe(true);
  });
  it("plans nothing when unchanged", () => {
    expect(planAds(data, readAds(data), NOW)).toEqual([]);
  });
});
