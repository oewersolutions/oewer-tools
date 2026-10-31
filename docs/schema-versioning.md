# Workbook schema versioning and migrations

The workbook layout is defined by `schemas/workbook_schema.json`. Its `schema_version` must equal the `schema_version` row in the workbook's `site_settings` sheet. `npm run validate` and CI fail with `schema_version_mismatch` when they differ.

## Version rules (`major.minor.patch`)

| Change | Bump | Migration needed? |
|---|---|---|
| Wording of notes/purpose, new validation that only rejects data that was already wrong | patch | No |
| New optional column with a default, new optional sheet, new enum value | minor | Usually a small one (add the column/sheet) |
| Renamed or removed column/sheet, changed meaning or type, new required column without a default, removed enum value | major | Yes |

Every schema change bumps the version in the same commit as the code that depends on it.

## How a workbook is checked

1. The reader loads the workbook.
2. `checkWorkbookVersion` compares versions:
   - **Equal:** continue.
   - **Workbook newer than the code:** error. Update the site code first.
   - **Workbook older than the code:** error, saying whether a migration path exists.
3. Normal validation runs.

## Adding a migration

1. Change `schemas/workbook_schema.json` and bump `schema_version`.
2. Add an entry to `migrations` in `lib/workbook/migrate.ts`:
   ```ts
   {
     from: "1.0.0",
     to: "1.1.0",
     description: "Add tools.icon column",
     up(workbook) {
       workbook.sheets.tools!.headers.push("icon");
       for (const row of workbook.sheets.tools!.rows) row.icon = "";
       // also set the schema_version row in site_settings to the new value
     },
   }
   ```
   Migrations work on the old-shaped `RawWorkbook` (rows keyed by header name, no schema checks) and must be pure and deterministic.
3. Chains are planned automatically (`planMigrations`): a 1.0.0 workbook can reach 1.2.0 through 1.0.0 → 1.1.0 → 1.2.0.
4. Update `scripts/create-seed-workbook.ts` so the seed matches the new schema.
5. Add a test with a small old-version fixture.

## Running a migration

`npm run migrate [path]` brings a workbook file up to the version the code expects, then validates it. It reads the file as it is (by header name), runs the registered migrations in order, and writes back **only what the migration changed** (new header cells, new default values, the version), so formatting and every other cell stay as they were. Git is the backup, so no copy is made. If the file is already current it says so and does nothing; if there is no path to the current version it says why and changes nothing.

Run it in **the same commit as the code that needs the new schema**, so a deploy never sees code and workbook at different versions (a mismatch fails the build safely, but it would stop the site updating until fixed). The admin page shows the mismatch as a problem if it loads an older workbook.

Columns are appended at the **end** of a sheet and the header must match the schema exactly, so a new column always goes last in `schemas/workbook_schema.json`.

## History

| Version | Change | Migration |
|---|---|---|
| 1.0.0 to 1.0.1 | Longer `tool_settings` values (6000 characters) | Version number only |
| 1.0.1 to 1.0.2 | Article images: `posts.cover_image`, `posts.cover_alt`, `post_blocks.caption` | Adds the three columns, empty |
