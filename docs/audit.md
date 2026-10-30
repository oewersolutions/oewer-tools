# Launch audit (T7.3)

Run on 30 October 2026 against the built site. Everything below is repeatable.

## What was checked, and the result

| Area | How | Result |
|---|---|---|
| **Search basics** | `e2e/seo-audit.spec.ts` visits every page in the sitemap | Fixed 14 pages with no or too-short meta descriptions. Every page now has a unique title (10 to 75 characters), a unique description (50 to 160), an absolute canonical that matches its address, Open Graph title and description, `lang`, a viewport, valid JSON-LD, and no `noindex` unless it is the 404 page or the admin. |
| **Page structure** | Same spec | Fixed heading order: list pages jumped from the page title straight to level-3 card titles; cards now use level 2 there. Exactly one `h1` per page, no skipped levels, no images without alt text, no `http://` resources, every `target="_blank"` link has `rel="noopener"`. |
| **Links** | Same spec | Every internal link on every page leads to a page that exists. Sitemap has no duplicates, no admin, absolute `https` addresses ending in `/`. `robots.txt` names the sitemap and blocks the admin. The feed is valid RSS with items. |
| **Accessibility** | `e2e/accessibility.spec.ts` (axe, WCAG 2 A/AA) on every page, plus the admin and the consent banner and ad boxes | No violations. Lighthouse accessibility: 100 on the home page, a tool page and an article. |
| **Speed and Core Web Vitals** | Lighthouse (mobile settings) on the home page, the EMI calculator and an article; plus `e2e/performance.spec.ts` budgets | Performance 100 on all three. LCP 1.2 to 1.5 s, CLS 0, total blocking time 10 to 20 ms. |
| **Best practices and SEO scores** | Lighthouse | SEO 100. Best practices 96: the only failure was a missing favicon (a 404 on every page). Added `app/icon.svg`, which also works under the GitHub Pages base path. |
| **Security: dependencies** | `npm audit` | Found 8 problems (1 high, 2 critical, all in the test tools, plus 2 moderate in a library the admin uses). Upgraded the test runner (`vitest` 5 with `vite` 8) and forced the library `uuid` to 11.1.1. Now **0 vulnerabilities**. The pull-request workflow now runs `npm audit --omit=dev --audit-level=high`, so a serious problem in what the site ships fails a check. |
| **Security: secrets** | Searched every tracked file, the built site and the whole Git history for token and key patterns | None found. |
| **Security: admin page** | Test in the audit spec; `tests/csp.test.ts` | The admin page has its own strict Content Security Policy: nothing is allowed except its own files and `api.github.com`, no `unsafe-inline` or `unsafe-eval`, no frames, no forms. It is `noindex`, and not in the sitemap or navigation. |
| **Security: content** | `tests/markdown.test.ts`, validator tests | Workbook text cannot contain raw HTML; links must be site paths, `https://` or a plain `mailto:`; cells starting with `= + - @` are refused. Tools run entirely in the browser, and privacy tests watch the network. |

## Not covered by a tool, worth knowing

- **HTTP security headers.** GitHub Pages does not let a site set headers such as `Content-Security-Policy`, `X-Frame-Options` or `Strict-Transport-Security` (it does force HTTPS). The public pages therefore have no CSP; the admin page, which holds the token, uses a `<meta>` policy. If you move to a host that allows headers (Cloudflare Pages or Netlify, see the plan's risks), add a policy there for the public pages too.
- **Search appearance and indexing** can only be judged after launch, in Google Search Console. Submit `sitemap.xml` there and watch coverage.
- **Real-device testing.** Layouts are tested in Chrome at desktop and phone sizes, and Firefox and WebKit run in CI, but a quick look on a real iPhone and an Android phone before launch is still worth doing.
- **Lighthouse on the live site** after the custom domain (T7.5) will include real network speed; expect similar scores.

## Repeating it

```bash
npm run build && npx playwright test e2e/seo-audit.spec.ts e2e/accessibility.spec.ts --project=chrome
npm audit --omit=dev
# speed: serve out/ and run Lighthouse
python3 -m http.server 4173 -d out &
npx lighthouse http://localhost:4173/ --only-categories=performance,accessibility,best-practices,seo
```

The audit spec and the accessibility and performance specs also run in the pull-request workflow.
