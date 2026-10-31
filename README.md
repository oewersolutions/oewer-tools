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
npm run build:preview   # test build: shows every tool that has a component as published (never deploy this)
npm run test:e2e   # browser tests on out/ (accessibility, responsive, tools, privacy, mobile performance); needs Google Chrome
CROSS_BROWSER=1 npm run test:e2e   # also Firefox and WebKit (run `npx playwright install firefox webkit` once)
npm run dev      # export content, then start the dev server
npm run build    # export content, then build the static site into out/
npm run validate [path]   # validate the workbook (exit 1 on any issue)
npm run export   # validate, then write generated/content.json (git-ignored, deterministic)
npm run seed   # regenerate data/oewer_database.xlsx with example content (overwrites it)
```

### GitHub Pages base path
A project site is served under `/<repo-name>`. Build it with `NEXT_PUBLIC_BASE_PATH=/<repo-name> npm run build`. Leave it unset for a custom domain or local development.

### Deploying
Two workflows in `.github/workflows/`:
- `validate.yml` runs on pull requests and non-main branches: workbook validation, typecheck, lint, tests, build and the browser tests.
- `deploy.yml` runs on every push to `main` (including admin workbook commits): validate, test, build, then publish. The publish job only starts if the build succeeded, so a failed build never replaces the live site.

One-time setup: in the repository go to Settings > Pages and set Source to "GitHub Actions". Add the repository variable `SITE_URL` (the live address, here `https://oewer.in`). Add `BASE_PATH` (`/<repo-name>`) only for a github.io project site; leave it unset on a custom domain. The live site is at **https://oewer.in**; see `docs/domain.md`.

## Status
Phases 1 to 6 are done: the workbook pipeline, the site and 20 tools (Phase 8 added the SIP, lumpsum, interest, RD, discount, age, days-between, unit converter and password tools), the blog, the browser-based admin (editing, history and restore, dashboard, publish status), analytics with a consent banner, and ad placements (off). Phase 7 launch work is under way: legal pages, audit, build safety and the custom domain are done; the acceptance checklist and the AdSense application remain. See `TASKS.md`; start with `docs/admin.md`, `docs/domain.md` and `docs/audit.md`.

## Security
The workbook is public: put only public content in it. Never commit tokens, credentials or exports. The admin GitHub token is entered in the browser at run time and is never stored in the repo or the bundle. Copy `.env.example` to `.env` locally; `.env` is git-ignored.
