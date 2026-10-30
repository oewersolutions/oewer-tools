# Acceptance checklist (T7.6)

The checklist from section 12 of the plan, run on 30 October 2026 against the code and the live site at https://oewer.in. Each line says what was checked and where the proof lives, so it can be repeated. **Needs you** marks the few things only a person with real devices can confirm.

## Data integrity

| Item | Result | Evidence |
|---|---|---|
| Duplicate IDs and slugs rejected | Pass | `tests/validate-workbook.test.ts` (duplicate IDs, duplicate slugs, author address clashes); also fails the deploy build |
| Broken references and malformed fields rejected | Pass | `tests/validate-workbook.test.ts`; `tests/build-failures.test.ts` runs real `validate` and `export` on broken workbooks and checks they exit with an error and write nothing |
| A changed SHA produces a conflict, not data loss | Pass | `e2e/admin.spec.ts` (someone else saves first: conflict choices, nothing silently overwritten); `tests/admin-changes.test.ts`; and the real repository on 29 October (T5.1 spike) |
| An older workbook version can be restored from history | Pass | `tests/admin-history.test.ts`, `e2e/admin.spec.ts`, and a run on the real repository (T7.5, `docs/domain.md`): byte-identical restore |

## Security and privacy

| Item | Result | Evidence |
|---|---|---|
| The token never appears in the repo, bundle, logs or URLs | Pass | Searched every tracked file, the built site and the whole Git history for token patterns: none (T7.3). New test: across a full sign-in and save, the token appears only in the `Authorization` header to `api.github.com`, never in any URL, body, console line, page content, storage or cookie (`e2e/admin.spec.ts`) |
| The token is cleared on sign-out and tab close | Pass | Tests: sign-out forgets it, idle sign-out after 30 minutes, "remember" uses this tab's session storage only, and a new tab starts signed out |
| The workbook contains no private data | Pass | Scanned all 191 rows in 16 sheets: the only email is the public contact address, no phone numbers, no key or token patterns. Admin settings sheet holds no secrets by rule |
| Consent and analytics-off behaviour tested | Pass | `e2e/consent.spec.ts`, `e2e/analytics-blocked.spec.ts`, `tests/analytics.test.ts`; `e2e/privacy.spec.ts` checks that with no Measurement ID nothing is requested from Google even if a stored choice says "accept" (see `docs/analytics.md`) |

## Website and publishing

| Item | Result | Evidence |
|---|---|---|
| Tools work on current Chrome, Safari, Firefox and Edge | Pass in Chrome, Firefox and the Safari engine (WebKit) on CI; **Needs you** for a real iPhone/Mac Safari and Edge check | See "Browsers" below |
| Tool and blog pages render meaningful content without JavaScript | Pass | New `e2e/no-javascript.spec.ts` with JavaScript turned off: the guide, examples and questions are in the HTML, the form is present, articles are fully readable, links work, and a notice says the tool itself needs JavaScript |
| Failed CI does not replace the working site | Pass | Proven on GitHub (T7.4, `docs/failed-builds.md`) |
| Sitemap, canonical URLs and redirects correct | Pass | `e2e/seo-audit.spec.ts` (every page, internal links, sitemap, robots, feed). Live: all 17 sitemap addresses on `oewer.in` return 200, the old `github.io` and `www` and `http` addresses all 301 to `https://oewer.in/`, unknown paths give a real 404. Redirect rows from the workbook become static redirect pages (`tests/seo.test.ts`) |
| Mobile layout and keyboard navigation work | Pass | `e2e/responsive.spec.ts` (no sideways scroll, reachable header and search) and the new `e2e/keyboard.spec.ts`: Tab reaches 15+ different controls on the home page with a visible focus ring on every one and no keyboard trap; the skip link works; the EMI calculator, the word counter and site search are fully usable by keyboard |

## Browsers

- **Chrome (desktop) and Chrome on a phone-sized screen:** all browser tests pass (351 on a normal build) locally and in CI.
- **Firefox and Safari's engine (WebKit, plus an iPhone profile):** the shared browser tests pass in CI on Linux and locally on macOS, including the admin, the tools, privacy, accessibility, keyboard and no-JavaScript tests.
- **Edge:** uses the same engine as Chrome, so the Chrome results apply. Not run separately.
- **Not covered by software:** a real iPhone or Mac Safari, and a real Android phone. **Please open https://oewer.in on your phone and try an image tool, the EMI calculator, and the menu.**

### What running Safari's engine found and fixed

1. **The image converter failed on its default setting in Safari.** Safari cannot create WebP files, and WebP was the default, so the first result was an error message. The tool now checks what the browser can create and starts on JPG where WebP is not possible.
2. **Tests acted before pages had finished loading** on slower machines. Pages now set `data-hydrated` on `<html>` once their JavaScript is running, the tests wait for it, and CI gets longer timeouts.
3. **Safari's engine reported a policy violation on the admin page** for the screen-reader route announcer that Next.js hides with an inline style. The admin keeps its strict policy (no inline styles); the announcer is now hidden by a rule in the stylesheet too, and the test tolerates only that one known report.
4. **Tab-through tests are skipped in Safari on a Mac**, because Safari there does not Tab to links unless a setting is on. Real Safari users who tab through pages are not affected by how the site is built; they use Safari's own setting.
5. **The pull-request workflow ran out of its 15 minutes** once the browser tests grew. It is now split into one job per browser with 40 minutes each (`docs/ci.md`).

## Still open before AdSense (T7.7)

- Real-device check above.
- Legal pages reviewed by someone qualified (`docs/legal-pages.md`).
- Original articles (T4.5) so the site is not thin on content; the seed articles are a start, not a finish.
- Google Analytics Measurement ID, then Search Console (`docs/analytics.md`, `docs/domain.md`).
- Revoke the token that was pasted in the chat, and use a fine-grained one for the admin.
