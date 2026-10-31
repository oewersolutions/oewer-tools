# Redesign QA (T9.10)

Run on 31 October 2026 against the redesigned site (Phase 9), with the whole browser suite, Lighthouse and the speed budgets.

## What the checks found, and what was done

| Finding | Why it mattered | Fix |
|---|---|---|
| **The consent banner was the "largest paint" on first visits.** Its paragraph was the biggest text on small screens and only appears after the page's scripts load, so the page looked finished only at 3.3 to 3.7 s on a slow phone. 19 pages missed the 2.5 s budget. | Search engines score this (Largest Contentful Paint), and most first visits come from search, so it hurts every new visitor. | The banner text is now short separate lines, each smaller than the page's own content. LCP is back to about 1.5 s on those pages. Keep this in mind when editing the banner: **never make one block of banner text large.** |
| **Blog pages: the lead picture loaded lazily** although it is on screen, so LCP was 2.3 to 2.5 s (borderline). | Same score. | The first card on each article list loads its picture at once (`priority` on `PostCard`). Now about 1.5 s. |
| **Pages prefetched every link in view** (dozens of 25 to 40 KB requests right after load) because the new design has many more links in view. | Slowed the page's own scripts and, in Lighthouse's simulated slow phone, pushed the home page to LCP 4.7 s (score 83). | Card links and the home tiles no longer prefetch (`prefetch={false}`); the page behind a link is fetched when it is clicked. Home is now 100 (LCP 1.4 s). Also saves visitors' data. |
| **Contact page scrolled sideways at 320 px**: the long email address in its card could not wrap. | A real layout bug on small phones. | The card can shrink and the address wraps anywhere (`min-w-0`, `overflow-wrap:anywhere`). |
| Browser tests that expected the old pages (the article tool card and "Keep reading", the contact link, the dashboard when analytics is already on, the "no Measurement ID" privacy test) | The redesign changed the wording and the live workbook has analytics on. | Updated; the privacy test now checks that **nothing is requested from Google before a visitor accepts**, whether or not an ID is set. |

## Results

- **Browser suite (Chrome and Chrome on a phone):** 356 passed, 0 failed, 28 skipped (they need special builds, below). The suite covers WCAG accessibility on every page (so contrast), the speed budgets, layout at 320, 768 and 1440 pixels, the SEO audit (titles, descriptions, canonical, headings, images, links, sitemap), keyboard, no-JavaScript and privacy.
- **Lighthouse (mobile, simulated slow phone, served with gzip like GitHub Pages):** accessibility, best practices and SEO are **100** on every page checked; performance is **100** on the home, tools and tool pages, and **92** on the blog and article pages (LCP 3.3 s in the simulation, about 1.5 s measured with real throttling). Without gzip the same pages score 83 to 85, because the scripts are three times as large; GitHub Pages compresses them.
- **Images:** every article picture carries real width and height (no layout shift: CLS 0 on every page), lazy loading below the first screen, a small copy for phones, and alt text (cover pictures in lists are decorative, with the title as the link text).
- **Tried and dropped:** preloading the lead image made the simulated score worse (85), so it is not used.

## Special builds (run by hand)

These skip in a normal run. Results are in the commit message of the task and `docs/ci.md` explains the commands: consent banner and blocked analytics (`docs/analytics.md`), ad layouts (`docs/ads.md`), ad consent chain.

## Still true, and worth knowing

- The Lighthouse "mobile" lab score on article pages stays in the low 90s because a large picture and the framework's scripts compete on the simulated slow network. If it ever needs to go higher: serve smaller covers (a 600 pixel copy for phones), or reduce the page's JavaScript.
- Cross-browser (Firefox and Safari's engine) results for the redesign come from the pull-request workflow; see T9.11.
