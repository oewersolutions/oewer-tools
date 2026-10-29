import { describe, expect, it } from "vitest";
import { parseToolContent, pickRelated } from "../lib/tools/content";
import { planMigrations } from "../lib/workbook/migrate";
import { TOOL_CONTENT } from "../scripts/tool-content";

const rows = [
  { tool_id: "TOOL0001", setting_key: "help", setting_value: "## Use it", value_type: "string" },
  { tool_id: "TOOL0001", setting_key: "faq", setting_value: '[{"q":"Q","a":"A"}]', value_type: "json" },
  { tool_id: "TOOL0001", setting_key: "max_file_size_mb", setting_value: "25", value_type: "int" },
  { tool_id: "TOOL0002", setting_key: "help", setting_value: "Other", value_type: "string" },
];

describe("parseToolContent", () => {
  it("collects one tool's content and ignores other settings", () => {
    expect(parseToolContent(rows, "TOOL0001")).toEqual({ help: "## Use it", examples: [], faq: [{ q: "Q", a: "A" }], related: [] });
  });
  it("returns empty content for a tool with none", () => {
    expect(parseToolContent(rows, "TOOL0009")).toEqual({ help: "", examples: [], faq: [], related: [] });
  });
});

describe("pickRelated", () => {
  const t = (id: string, cat: string) => ({ tool_id: id, category_id: cat });
  const all = [t("TOOL0001", "A"), t("TOOL0002", "A"), t("TOOL0003", "B"), t("TOOL0004", "A"), t("TOOL0005", "A"), t("TOOL0006", "A")];
  it("uses the chosen tools in order, skipping the tool itself and unpublished ones", () => {
    expect(pickRelated(all[0]!, ["TOOL0003", "TOOL0001", "TOOL0099", "TOOL0002"], all).map((x) => x.tool_id)).toEqual(["TOOL0003", "TOOL0002"]);
  });
  it("falls back to the same category, limited to three", () => {
    expect(pickRelated(all[0]!, [], all).map((x) => x.tool_id)).toEqual(["TOOL0002", "TOOL0004", "TOOL0005"]);
  });
});

describe("seed content", () => {
  it("covers all 10 tools with help, examples, FAQ and related tools", () => {
    expect(Object.keys(TOOL_CONTENT)).toHaveLength(10);
    for (const c of Object.values(TOOL_CONTENT)) {
      expect(c.help.length).toBeGreaterThan(0);
      expect(c.examples.length).toBeGreaterThan(0);
      expect(c.faq.length).toBeGreaterThan(0);
      expect(c.related.length).toBeGreaterThan(0);
    }
  });
});

describe("migration 1.0.0 to 1.0.1", () => {
  it("is registered", () => {
    expect(planMigrations("1.0.0", "1.0.1")).toHaveLength(1);
  });
});
