import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Column {
  name: string;
  type: string;
  enum?: string;
  ref?: string;
}
interface Schema {
  types: Record<string, string>;
  enums: Record<string, string[]>;
  sheets: Record<string, { primary_key: string; columns: Column[] }>;
}

const schema = JSON.parse(
  readFileSync(new URL("../schemas/workbook_schema.json", import.meta.url), "utf-8"),
) as Schema;

describe("workbook_schema.json", () => {
  it("defines 16 sheets", () => {
    expect(Object.keys(schema.sheets)).toHaveLength(16);
  });

  it("uses only known column types, enums and primary keys", () => {
    for (const [sheet, def] of Object.entries(schema.sheets)) {
      const names = def.columns.map((c) => c.name);
      expect(names, `${sheet} primary key`).toContain(def.primary_key);
      for (const col of def.columns) {
        expect(schema.types, `${sheet}.${col.name} type`).toHaveProperty(col.type);
        if (col.type === "enum") expect(schema.enums).toHaveProperty(col.enum!);
      }
    }
  });

  it("resolves every foreign key to an existing column", () => {
    for (const def of Object.values(schema.sheets)) {
      for (const col of def.columns.filter((c) => c.type === "ref")) {
        const [sheet, column] = col.ref!.split(".");
        expect(schema.sheets[sheet!]?.columns.map((c) => c.name)).toContain(column);
      }
    }
  });
});
