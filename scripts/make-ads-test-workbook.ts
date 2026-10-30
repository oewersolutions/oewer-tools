import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyChanges, findRecord, type Change } from "../lib/admin/changes";
import { loadWorkbook, readCell, saveWorkbook } from "../lib/admin/edit";
import { schema } from "../lib/workbook";

/**
 * Writes a COPY of the workbook with ads switched on (a made-up publisher id and the tool-page placement), for the
 * ad consent browser tests. The real workbook is never touched.
 *
 *   npx tsx scripts/make-ads-test-workbook.ts /tmp/ads-test.xlsx
 */
const out = process.argv[2];
if (!out) throw new Error("Give the path of the copy to write.");
const wb = await loadWorkbook(new Uint8Array(await readFile(resolve("data/oewer_database.xlsx"))));
const set = (sheet: string, pk: string, column: string, after: string): Change => ({ type: "set", sheet, pk, column, before: readCell(wb, schema, { sheet, row: findRecord(wb, schema, sheet, pk), column }), after });
const { conflicts } = applyChanges(
  wb,
  schema,
  [
    set("site_settings", "ads_enabled", "setting_value", "true"),
    set("site_settings", "adsense_publisher_id", "setting_value", "ca-pub-1234567890123456"),
    set("advertisements", "AD0002", "enabled", "true"),
    set("advertisements", "AD0002", "ad_unit_id", "1234567890"),
  ],
  new Set(),
);
if (conflicts.length > 0) throw new Error("The workbook no longer has the placements this script expects.");
await writeFile(resolve(out), await saveWorkbook(wb));
console.log(`Wrote ${out}`);
