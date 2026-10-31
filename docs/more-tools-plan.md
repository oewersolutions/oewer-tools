# More tools: plan (Phase 8)

**Status (31 October 2026): T8.1 to T8.10 are done.** The site has 32 tools and each new tool has a guide article. Merge PDF, split PDF, images to PDF and the EXIF remover (Batch D) are done; image crop and rotate are not.

Agreed starting point (30 October 2026): the finance calculators plus the three best everyday utilities, one guide article per tool. Developer tools and PDF/image tools come later.

## Rules every new tool follows

- **Runs entirely in the browser.** No uploads, no network calls, no live data. That rules out currency, prices and anything else that needs a server.
- **No rules that change every year** (income tax, for example) unless you commit to updating them yearly.
- **Estimates, said plainly.** Finance and health results carry a one-line note on the page; the Terms already say results are not advice.
- **Pure maths in `lib/tools/`, unit tested** against worked examples and known edge cases (zero rate, one month, very large amounts), like the existing calculators.
- **Tool page content from the workbook:** how-to text, two or three worked examples, four or five questions, related tools, and the guide article, set up in the admin (`docs/tool-content.md`).
- **Checks that already exist apply automatically:** accessibility, privacy (network watched while the tool is used), SEO audit, keyboard, no-JavaScript, Safari, mobile. Add the new tool to the lists in `e2e/tools.spec.ts` and `e2e/privacy.spec.ts`.
- **One original guide article per tool**, written for people: what it calculates, the formula in plain words, a worked example, common mistakes. Drafted for you to review and edit.

## Per-tool steps

1. Add the component key in `lib/tools/keys.ts` and register the component in `components/tools/registry.ts`.
2. Write the maths in `lib/tools/…` and its unit tests.
3. Build the component with the shared field and result parts in `components/tools/ui.tsx`, including error messages for bad input.
4. Add the tool, its content and its related links in the admin (the Add tool button appears once a component exists), plus search settings.
5. Write the guide article and link it to the tool.
6. Add the tool to the browser test lists; run lint, tests, build and the audits.

## The tools

### T8.1 Growth calculators
- **SIP calculator.** Inputs: monthly amount (₹), expected annual return (%), years. Output: invested amount, estimated returns, maturity value. Formula: monthly rate `i = r / 12 / 100`, `n = years × 12`, `FV = P × ((1 + i)^n − 1) / i × (1 + i)` (payments at the start of each month; stated on the page). Handles `r = 0`.
- **Lumpsum calculator.** Inputs: amount, annual return, years. Output: maturity value, gain, and the equivalent yearly growth. `FV = P × (1 + r/100)^years`.
- Shared module for the growth maths; the guide article explains SIP versus lumpsum and why returns are only estimates.

### T8.2 Interest calculators
- **Compound interest.** Principal, rate, years, compounding (yearly, half-yearly, quarterly, monthly, daily). `A = P × (1 + r/n)^(n × t)`. Shows interest earned and a year-by-year table.
- **Simple interest.** `SI = P × R × T / 100`, with total amount; time in years, months or days. The article contrasts simple and compound with the same numbers.

### T8.3 Deposit and price calculators
- **RD calculator.** Monthly deposit, annual rate, months. Uses the usual Indian bank convention of quarterly compounding; the page states the convention and that banks' own figures can differ by a little.
- **Discount / sale price calculator.** Original price, discount %, optional second discount. Shows price after discount, amount saved, and effective total discount (two discounts do not simply add up, which the article explains).

### T8.4 Date calculators
- **Age calculator.** Date of birth and "as of" date (today by default). Shows years, months, days, total days, and days to the next birthday. Careful with leap years and month ends; tested on edge dates (29 February, 31st to a 30-day month).
- **Days between dates.** Two dates; shows total days, weeks, and years/months/days, with an option to include the end date. Shared date maths with the age calculator, done on whole dates so time zones and daylight saving cannot shift a result.

### T8.5 Unit converter
- Categories: length, weight, temperature, area, volume, speed. Pick a category, enter a value, see every unit in that category at once. Factor tables plus offset formulas for temperature, tested against known values (1 inch = 25.4 mm, 0 °C = 32 °F, and so on). Indian units where useful (lakh/crore in the number format, acre, bigha noted as region-dependent only if clear).

### T8.6 Password generator
- Length 8 to 64, character sets, an option to avoid look-alike characters, and a strength estimate (bits). Uses `crypto.getRandomValues` with rejection sampling so every character is equally likely; nothing is stored or sent. Copy button. The article explains length versus complexity and password managers.

### T8.7 Wrap-up
- Home page tool counts and featured tools, search index, categories' descriptions, sitemap, related-tool links between the new and existing tools, rerun the SEO, accessibility and privacy audits and the cross-browser jobs, and update `docs/`.

## Later (not started)

- **Batch D, PDF and images:** merge PDF, split PDF, image to PDF, image crop and rotate, EXIF remover, image to Base64. A PDF library loaded only when the tool is opened, so other pages stay fast. A new category, "PDF and document tools".
- **Batch C, developer tools:** All eight are done (T8.8 and T8.9).

## Order and effort

About 3 days for T8.1 to T8.3, 2 for T8.4 to T8.6, 1 for T8.7, including the articles. Start with T8.1; each task is committed on its own, like the earlier phases, so the site stays deployable after every step.
