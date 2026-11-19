# Improvement month: 11 November to 10 December 2026

**Decision (11 November 2026):** no new articles for one month. The daily article task stays **off**. The month goes to making the tools and games deeper and more numerous, promoting the site, and watching whether people notice it. We then ask AdSense for a new review (earliest around 1 to 8 December, see "Review gate").

**Why:** AdSense refused ads for "low value content". Google wants unique value, a steady presence and real user interest. Better tools, daily games people come back to, and visible traffic growth answer all three. More articles do not.

## Ground rules for the month

1. **No new blog articles.** A new tool explains itself on its own page (help text, examples, FAQ, worked workings). The only exception is a guide we choose to write by hand for a tool that needs one.
2. **Never change existing page addresses** (tool, game or category URLs). Moving them restarts Google's wait. The Pace Calculator move keeps its URL working with a redirect, or does not happen at all (see W1).
3. **Every new or changed page ships complete:** title and description (hand written, 60 and 160 characters), how-to, examples, 3+ FAQs, the "How this is calculated" panel for calculators, related tools, tests (unit, e2e, privacy, accessibility), and a performance check.
4. **One batch per commit** and the user says "commit and push" each time, as before.
5. **Keep the privacy promise:** nothing typed into a tool leaves the device, and the privacy tests must pass for every new tool.
6. **Keep the daily puzzles running** (see W0), because the games are the return-visit engine.

## Week 0 (now): housekeeping that unblocks everything

| ID | Task | Done when |
| --- | --- | --- |
| W0.1 | **Check the live deploy.** Open oewer.in/about and a tool page and confirm the last four pushes are live (authors on About, new tool titles, share links). If not, check the Actions tab. | Live pages match the repo |
| W0.2 | **Re-enable the daily puzzle task** (`daily-puzzles`). Puzzles for five games end on 22 November; after that visitors get a stale puzzle. | Task enabled, 14 days ahead again, Snake needs no puzzles |
| W0.3 | **Fix the heading level on Hive Words and Mini Crossword** (`components/games/HiveWords.tsx`, `MiniCrossword.tsx`: the h3 before the h2 "How to play" should be an h2 or follow it). | SEO audit passes for both game pages |
| W0.4 | **Replace the broad GitHub token** with a fine-grained one limited to this repository (owner does this). | Old token revoked |
| W0.5 | **Set up measuring** (see "Measuring"): Search Console weekly export, analytics events for tool use, games started and games completed, and a weekly note in `docs/traffic-log.md`. | First baseline row written |
| W0.6 | **Pace Calculator**: decide to move it from Utilities to Health and Fitness (keep the old address via the redirect sheet) or leave it. | Decision recorded |

## Week 1: deepen the tools people search for most

Tools are chosen by search demand. For each tool below add the extras, update its help, examples, FAQ and "How this is calculated" panel, and add tests.

| ID | Tool | What to add |
| --- | --- | --- |
| W1.1 | EMI Calculator | Part-prepayment (one-off and monthly), step-up EMI, and a comparison of two loans; yearly and monthly schedule download (CSV) |
| W1.2 | Income Tax Calculator | **Old versus new regime comparison** for an Indian salary with standard deduction, 80C, 80D and HRA inputs, and a note that slabs change yearly. (Earlier decision was generic slabs; this adds the regime comparison with the current published slabs, dated, and a clear "check the latest rules" note.) |
| W1.3 | SIP Calculator | **Step-up SIP** (yearly increase), inflation-adjusted value, and a goal mode: "how much SIP to reach ₹X in N years" |
| W1.4 | FD / RD / Lumpsum | Senior-citizen extra rate, TDS estimate, compounding choice, and the effective yield shown |
| W1.5 | GST Calculator | Reverse and forward modes with the CGST, SGST and IGST split already there, plus common rate presets and an invoice-style breakdown |
| W1.6 | Age, BMI, Percentage | Age in several units and next-birthday countdown (done), BMI for adults with the Asian cut-offs note, percentage with a "quick answers" table |
| W1.7 | Image Compressor | **Target size** mode ("under 100 KB", "under 50 KB") because people search for exactly that; batch of several images |
| W1.8 | Word Counter | Keyword density, longest sentence, readability score |

Done when each tool has its added mode, tests pass, and its description is updated.

## Week 2: add new tools (about 12)

Chosen from what people search for and what fits the existing categories. Each is built the usual way: component, pure maths or logic in `lib/tools/`, registry and key, workbook rows, tests, hand-written SEO text.

| Group | Tools |
| --- | --- |
| Text tools (new **Text Tools** category) | Case converter, text diff (compare two texts), remove duplicate lines, sort lines, find and replace, slug generator, lorem ipsum generator |
| Image and PDF | PDF page rotate and reorder, PDF compress (if the library cost is acceptable), image to Base64, favicon generator, resize image for common forms (passport size, 100 KB) |
| Date and time | Time zone converter, countdown timer, working days calculator, week number |
| Health and study | Water intake, protein intake, percentage to CGPA, marks percentage, reading time |
| Finance (India) | Gratuity, PPF, EPF, HRA exemption, NPS, stamp duty (state notes) |

Done when: at least 10 new tools are live, each with its own title, description, FAQ and working panel, and the site totals are updated on the home page and search index.

## Week 3: games that bring people back

Daily visitors are the clearest "user interest" signal, so games get streaks, stats and variety.

| ID | Task | Notes |
| --- | --- | --- |
| W3.1 | **Streaks and stats on every game**, shown on the game page and the hub: current streak, longest streak, games played, win rate, guess distribution where it applies. Stored in the browser only. | Word Guess has some already; make it shared |
| W3.2 | **"Today's puzzles" progress** on the home page: ticks for the games already finished today, and a "next unplayed game" button. | Encourages playing all |
| W3.3 | **Share result** in the same style for all games (emoji grid or short text), with the site link | Free word-of-mouth |
| W3.4 | **New game: Daily Sudoku** (easy, medium, hard; solvable by logic, checked by the puzzle script) | People search for sudoku a lot |
| W3.5 | **New game: Number Crunch** (reach a target with six numbers and + − × ÷, Countdown-style) | Original name and rules |
| W3.6 | **New game: Anagram Scramble** (unscramble words against a timer) or **2048** and **Minesweeper** as no-puzzle-data games | Pick two: one data game, one instant game |
| W3.7 | Puzzle archive page per game ("Play earlier puzzles") with the calendar | More pages worth indexing |
| W3.8 | Each game page gets a longer, real "How to play", tips, and strategy text | Required for ad approval |

Done when: all games show streaks and stats, at least two new games are live, the daily puzzle task also makes the new data games, and the game tests pass on Chrome, mobile Chrome and WebKit.

## Week 4: polish, speed, trust, and review prep

| ID | Task |
| --- | --- |
| W4.1 | Sweep the remaining **thin tool pages** (any tool page under 400 words of help, FAQ and examples): expand them. |
| W4.2 | Check **Firefox and Safari** on the main tools and games (`CROSS_BROWSER=1`), fix what breaks. |
| W4.3 | **Internal links:** each tool links to related tools and its games hub where it makes sense; the home page shows the most used tools. |
| W4.4 | **Author credibility:** last names, a true line of background and a photo for Anand and Priyadarshini on About (owner supplies; I add). |
| W4.5 | **Speed and mobile pass:** performance budget, images, and layout on small phones for the new pages. |
| W4.6 | **Prepare the AdSense review:** run the full site audit (SEO, accessibility, privacy), check that About, Contact, Privacy, Terms and the Editorial Policy are current, and write the review note. |

## Promotion (runs the whole month, owner does the posting, I draft)

Free channels only; no paid ads (a paid campaign was cancelled on 11 November).

- Week 1: Quora and Reddit answers for 5 specific questions (EMI, GST, image size for forms); Bing Webmaster Tools set up.
- Week 2: Product Hunt launch text and 3 tool directory submissions (AlternativeTo and similar).
- Week 3: One short video a day from the existing ad video template, showing one tool or game; WhatsApp and Telegram group shares for the games.
- Week 4: A "what we built this month" post on LinkedIn and X from Anand and Priyadarshini.

## Measuring: what "noticed" means

Weekly, on the same day, write one row in `docs/traffic-log.md` from Search Console and analytics:

| Measure | Where | Healthy sign |
| --- | --- | --- |
| Impressions and clicks | Search Console, Performance | Rising week on week |
| Indexed pages | Search Console, Pages | Rising or steady; "crawled, not indexed" shrinking |
| Queries and pages that show | Search Console | New tool pages appearing for narrow searches |
| Users, returning users | Analytics | Returning share above 10% by week 4 |
| Tool uses per visit and top tools | Analytics events | Used tools identified, so week 1 and 2 effort follows them |
| Games started and finished, next-day return | Analytics events | Finish rate above 50%; some players return |
| Referral sources | Analytics | Which posts and directories send people |

Do not judge on a single day. Compare week to week.

## Review gate: when to ask AdSense again

Ask for the new review only when **all** of these hold (around 1 to 8 December):

1. At least **three weeks** have passed since the cleanup went live (10 November).
2. Search Console shows clicks and impressions **growing**, with some real visitors every day.
3. All Week 0 fixes and the Week 1 to 3 work are live, and the site audit passes.
4. About names the authors with a true line each, and the Contact, Privacy, Terms and Editorial Policy pages are current.
5. No new article batches were added during the month (a clean quiet period).

If the review fails again, read the stated reason, fix that, and wait at least another two to three weeks.

## Risks

- **Puzzles run out.** Handled in W0.2.
- **Too many new tools too fast can look like bulk content.** Each ships complete and different, and the month's pace is about 3 to 5 new tools a week, not 30.
- **Tax rules change.** The tax comparison states its date and links to the official source, and is reviewed each April.
- **Promotion is slow.** Real visitors take weeks; the plan measures trends, not single days.
