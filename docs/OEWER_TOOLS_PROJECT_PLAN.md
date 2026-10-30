# OEWER Tools — Project Build Plan

**Version:** 1.1 (JavaScript-only, GitHub Pages)  
**Date:** 2026-10-29  
**Brand:** OEWER Tools  
**Primary brand color:** `#174f49`  
**Status:** Build started (T1.1–T1.3 done)

**Changes from v1.0:** the whole project is JavaScript/TypeScript with no server. The workbook is read at build time by Node scripts in GitHub Actions and edited from a static, browser-based admin page that commits through the GitHub API. The Python scripts, the separate admin API and the private analytics database are removed. Analytics moves to a hosted privacy-friendly service.

## 1. Vision and goals

Build a fast, mobile-friendly, search-engine-discoverable collection of free online tools and helpful blog articles under the OEWER brand, hosted on GitHub Pages (`github.io`, later a custom domain). Monetize through Google AdSense after meeting eligibility and policy requirements. Provide a browser-based admin page for editing every sheet of the main Excel workbook and publishing changes.

### Success criteria
- Visitors can use tools without an account.
- Tools and blog pages are crawlable static HTML with descriptive URLs.
- Admin can edit content and publish without opening GitHub or Excel.
- No secret is ever stored in the repo or in the public bundle.
- Site works with no backend; analytics failure never affects the site.

## 2. Key architectural decisions

1. **One content workbook:** `data/oewer_database.xlsx` in the repo holds all public content and configuration, one worksheet per table. It is public, so it must never contain private data.
2. **JavaScript only:** Node 20+ and TypeScript for build scripts, validator, tests and the site. No Python and no server.
3. **Build-time reading:** a Node script (`exceljs` or SheetJS) reads the workbook in GitHub Actions, validates it against `schemas/workbook_schema.json`, and exports JSON. Next.js static export builds real HTML pages from that JSON. Visitors never download or parse the workbook.
4. **Browser-based admin writing:** the static `/admin` page reads and writes the workbook through the GitHub Contents API from the owner's browser. Each write includes the file's current SHA, so a concurrent change is rejected as a conflict instead of overwriting data. A commit triggers the Actions rebuild.
5. **Admin authentication:** the owner pastes a GitHub fine-grained personal access token limited to this repository's Contents (read/write) permission. It is held in memory or `sessionStorage` only, never committed, bundled or logged. The page refuses to enable writes if the token has broader access than expected where this can be detected.
6. **Analytics:** a hosted privacy-friendly service (GoatCounter, Plausible, or Cloudflare Web Analytics; choose in T0.3). There is no visitor data in the repo. Tool-usage events are sent to that service as custom events.
7. **Hosting:** GitHub Pages. Review its terms for an advertising-supported commercial site before launch, and use a custom domain (needed for AdSense). Cloudflare Pages or Netlify can host the same static build if Pages is unsuitable.
8. **Audit and backup:** Git history is the audit log and backup history. Restore means committing an older version of the workbook.
9. **Privacy:** consent banner, privacy policy and coarse, non-identifying analytics only.

## 3. System overview

```text
Visitors --> GitHub Pages (static tools + blog + ads)
                 ^                         |
                 | deploy                  | page views / tool events
          GitHub Actions                   v
        (validate + export + build)   Hosted analytics service
                 ^
                 | push
          GitHub repository  <---- GitHub Contents API (SHA check) ---- Admin page
          (workbook + source)                                           (owner's browser,
                                                                         fine-grained token)
```

## 4. Repository layout

```text
oewer-tools/
├── app/                       # Next.js routes (tools, blog, admin)
├── components/
├── lib/                       # Shared TS: workbook read/write, validation, GitHub client
├── public/assets/
├── data/
│   └── oewer_database.xlsx    # Public content only
├── scripts/                   # Node/TS: validate-workbook, export-content, build-sitemap, create-seed-workbook
├── schemas/
│   └── workbook_schema.json
├── tests/
├── docs/
├── .github/workflows/
│   ├── validate.yml
│   └── deploy.yml
├── .env.example
└── README.md
```

**Do not commit** tokens, credentials, analytics exports or private backups.

## 5. Excel workbook design

**Workbook:** `data/oewer_database.xlsx`. One worksheet per table, fixed header row, no merged cells. The authoritative, machine-readable definition is `schemas/workbook_schema.json` (schema version stored in `site_settings` as `schema_version`).

| Worksheet | Primary key | Purpose |
|---|---|---|
| `site_settings` | `setting_key` | Name, theme, feature flags, schema version |
| `pages` | `page_id` | About, privacy, contact, terms |
| `navigation` | `nav_id` | Menus and footer links |
| `tool_categories` | `category_id` | Tool categories |
| `tools` | `tool_id` | Tool registry |
| `tool_settings` | `setting_id` | Configurable tool behavior |
| `posts` | `post_id` | Blog post metadata |
| `post_blocks` | `block_id` | Blog article body |
| `blog_categories` | `category_id` | Blog categories |
| `tags` | `tag_id` | Reusable tags |
| `post_tags` | `relation_id` | Many-to-many post tags |
| `authors` | `author_id` | Public author profiles |
| `seo_metadata` | `seo_id` | Search metadata |
| `advertisements` | `ad_id` | Ad placements (public slot IDs only) |
| `redirects` | `redirect_id` | URL migrations |
| `admin_settings` | `setting_key` | Non-sensitive admin UI preferences |

### Data integrity rules
- Stable, immutable IDs (`TOOL0001`, `POST0001`); never use row numbers.
- Slugs unique within their route namespace.
- Foreign keys must refer to existing records.
- `status` enum: `draft`, `published`, `archived`.
- Timestamps use UTC ISO 8601.
- Reject invalid types, missing required fields, duplicate IDs, broken references, unsafe links, and unsupported HTML.
- Reject formulas and external links; only literal values are allowed.
- Keep workbook size and block length within the schema limits.
- Tool rows configure *existing implemented components*; adding a row never creates executable code.
- The same validation code runs in the admin page (before commit) and in CI (before build).

## 6. Analytics

- Use a hosted, privacy-friendly service; no visitor data is stored in the repo or workbook.
- Track page views and tool usage (`tool_open`, `tool_complete`) as coarse events. No fingerprinting, no personal identifiers.
- Load analytics only per the consent rules for the chosen service and jurisdiction.
- The site must work normally if the analytics script is blocked or down.
- Admin dashboard shows a link or embed of the service's public/shared dashboard, not raw visitor data.
- If a `visitor_data.xlsx` export is wanted, use the service's own export. A custom store can be added later as a future enhancement.

## 7. Admin panel requirements

**Access:** static `/admin` page. It works from desktop or mobile and needs only the owner's GitHub token.

### Features
1. Token sign-in (memory/`sessionStorage` only), with a sign-out that clears it.
2. Dashboard: counts of published tools and posts, latest commits, latest deployment status (GitHub API).
3. Spreadsheet manager: list worksheets, paginate/search/filter rows, add/edit/delete, field validation, bulk import/export.
4. Content forms: tools, categories, blog editor with ordered blocks, SEO fields, ad placements.
5. Draft and publish workflow: save as draft, preview, publish, deployment status.
6. History and restore: list previous workbook commits, restore after confirmation.
7. Audit: Git commit history with a descriptive message per change.

### Safe write workflow
```text
Admin edits record in browser
  -> fetch latest workbook + blob SHA via GitHub API
  -> apply change, validate the full workbook and foreign keys
  -> commit via Contents API with the SHA (rejected if changed)
  -> Actions validates again and rebuilds
  -> admin shows build status and any errors
```

If the SHA changed while editing, show a conflict and require refresh. Never silently overwrite newer data. A failed CI validation or build must not replace the live site.

## 8. Public website requirements

### MVP tool categories
- **Image:** compressor, resizer, JPG/PNG/WebP converter.
- **Finance:** EMI, FD interest, GST, percentage calculators.
- **Developer:** JSON formatter/validator.
- **Utilities:** QR code generator, word counter.

All tools run in the browser; files never leave the device.

### Page templates
Homepage, category pages, tool pages (working utility, instructions, examples, FAQ, related articles), blog index/category/article, About, Contact, Privacy, Terms, 404.

### SEO
- Real static HTML for every tool and article.
- Unique titles, descriptions, canonical URLs, structured data where appropriate.
- Sitemap, robots.txt, clean internal links, breadcrumbs.
- Good Core Web Vitals, accessibility, responsive layout.
- Original, accurate content; no thin or mass-generated pages.
- Redirects from the `redirects` sheet are generated as static redirect pages (GitHub Pages has no server rules).

## 9. AdSense readiness

- Do not assume approval or revenue.
- Apply only with original content, clear navigation, working tools, required disclosures and a custom domain.
- Add ad code via the `advertisements` sheet and `site_settings` after approval.
- No ads that obstruct tools or invite accidental clicks; test mobile and desktop.
- Provide consent and privacy disclosures where required.

## 10. Technology stack

| Layer | Technology | Notes |
|---|---|---|
| Public frontend | Next.js + TypeScript + Tailwind CSS | Static export |
| Tool logic | Browser TypeScript | Files stay local |
| Excel processing | Node: `exceljs` or SheetJS (decide in T1.4) | Build scripts and admin page |
| Validation and tests | TypeScript + Vitest | Shared by CI and admin |
| Admin | Static React page + GitHub Contents API | Fine-grained token |
| Analytics | Hosted privacy-friendly service | Chosen in T0.3 |
| CI/CD | GitHub Actions | Validate, export, build, deploy |
| Hosting | GitHub Pages + custom domain | Confirm terms |

## 11. Delivery phases

See `TASKS.md` for the task list.

- **Phase 0** Requirements and decisions (hosting, analytics service, token handling, privacy).
- **Phase 1** Workbook schema, seed data, Node validator and export.
- **Phase 2** Website shell and design system.
- **Phase 3** Tool engine and 10 MVP tools.
- **Phase 4** Blog engine.
- **Phase 5** Browser-based admin panel.
- **Phase 6** Analytics integration and consent.
- **Phase 7** AdSense readiness, QA and launch.

**Indicative total:** 6–9 weeks for one developer; an estimate, not a commitment.

## 12. Testing and acceptance checklist

### Data integrity
- [x] Duplicate IDs and slugs rejected. (docs/acceptance.md)
- [x] Broken references and malformed fields rejected. (docs/acceptance.md)
- [x] A changed SHA produces a conflict, not data loss. (docs/acceptance.md)
- [x] An older workbook version can be restored from history. (docs/acceptance.md)

### Security and privacy
- [x] The token never appears in the repo, bundle, logs or URLs. (docs/acceptance.md)
- [x] Token is cleared on sign-out and tab close. (docs/acceptance.md)
- [x] The workbook contains no private data. (docs/acceptance.md)
- [x] Consent and analytics-off behavior tested. (docs/acceptance.md)

### Website and publishing
- [x] Tools work on current Chrome, Safari (engine), Firefox and Edge (Chromium); a real-device Safari check is still yours to do (docs/acceptance.md).
- [x] Tool and blog pages render meaningful content without JavaScript. (docs/acceptance.md)
- [x] Failed CI does not replace the working site (proven on GitHub, see docs/failed-builds.md).
- [x] Sitemap, canonical URLs and redirects correct. (docs/acceptance.md)
- [x] Mobile layout and keyboard navigation work. (docs/acceptance.md)

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Token leaked or stolen from the browser | Fine-grained, single-repo, short expiry; memory/`sessionStorage` only; strict CSP; no third-party scripts on `/admin` |
| Concurrent workbook edits | SHA check on every write, conflict UI |
| Workbook corruption | Validate before commit and again in CI; Git history for restore |
| Public workbook | Public content only; reviewed in schema rules |
| Pages terms vs ads | Confirm terms; Cloudflare Pages/Netlify as fallback |
| Pages has no server redirects | Generate static redirect pages |
| Commit churn / build minutes | Batch edits; one publish per session |
| Thin content / AdSense rejection | Original guides, quality tools |
| Feature sprawl | Fixed MVP and phased releases |

## 14. Initial sprint backlog

1. [x] Create repository and README.
2. [x] Finalize workbook schema.
3. [x] Create seed workbook.
4. [ ] Node workbook validator with unit tests.
5. [ ] Excel-to-JSON export script.
6. [ ] OEWER design tokens and page layout.
7. [ ] Tool registry and first working calculator.
8. [ ] First static blog article from the workbook.
9. [ ] GitHub Actions validation and Pages preview deploy.
10. [ ] Admin token sign-in and read/write spike.

## 15. Future enhancements (not MVP)

- Custom analytics endpoint (serverless) and `visitor_data.xlsx` export.
- Real multi-user admin with a backend and roles.
- PDF tools with a processing backend.
- Multi-language content.
- CSV/JSON import/export.
- Search trend reporting.

---

**Guiding principle:** One public Excel workbook for content, built into a static site by GitHub Actions, and edited by one owner from a browser-based admin page, with no servers to run.
