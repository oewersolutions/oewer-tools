# OEWER Tools

Free online tools and helpful blog articles under the OEWER brand (primary color `#174f49`), hosted on GitHub Pages. JavaScript/TypeScript only, no server.

## Architecture in brief
- **Content:** one public workbook, `data/oewer_database.xlsx`, defined by `schemas/workbook_schema.json`.
- **Build:** GitHub Actions run Node scripts that validate the workbook, export JSON, and build a static Next.js site deployed to GitHub Pages.
- **Admin:** a static `/admin` page reads and writes the workbook through the GitHub Contents API from the owner's browser, using a fine-grained personal access token and a SHA check to prevent overwrites.
- **Analytics:** a hosted privacy-friendly service. No visitor data lives in this repo.

See `docs/OEWER_TOOLS_PROJECT_PLAN.md` for the plan (v1.1) and `TASKS.md` for the build tasks.

## Layout
| Path | Purpose |
|---|---|
| `app/` | Next.js routes: public site and `admin/` |
| `components/`, `lib/` | Shared UI and TypeScript logic (workbook, validation, GitHub client) |
| `public/assets/` | Static assets |
| `data/` | `oewer_database.xlsx` (public content only) |
| `scripts/` | Node/TS scripts: validate, export, sitemap, seed |
| `schemas/` | Workbook schema |
| `tests/`, `docs/` | Tests and documentation |
| `.github/workflows/` | CI: validate and deploy |

## Development
Requires Node 20+ (`.nvmrc` pins 22).

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run validate [path]   # validate the workbook (exit 1 on any issue)
npm run export   # validate, then write generated/content.json (git-ignored, deterministic)
npm run seed   # regenerate data/oewer_database.xlsx with example content (overwrites it)
```

## Status
Phase 1 done (T1.1–T1.6): skeleton, schema, seed workbook, Node/TypeScript tooling, the workbook validator, the JSON export and schema versioning (`lib/workbook/`, shared by the CLIs, CI and the future admin page). See `docs/schema-versioning.md`.

## Security
The workbook is public: put only public content in it. Never commit tokens, credentials or exports. The admin GitHub token is entered in the browser at run time and is never stored in the repo or the bundle. Copy `.env.example` to `.env` locally; `.env` is git-ignored.
