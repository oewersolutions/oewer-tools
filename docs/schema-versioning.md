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

## Still to build with the first real migration

The planner and version check are done and tested. The parts that need a real case to design against are built when the first migration is needed:

- a lenient reader that produces `RawWorkbook` from an old `.xlsx`,
- a writer that saves migrated data back to `.xlsx` (also reused by the admin panel in Phase 5),
- a `npm run migrate` command that backs up the file, applies the chain, writes the result, and re-validates it.

Until then, with no migrations registered, a version mismatch is reported as an error with no migration path.
