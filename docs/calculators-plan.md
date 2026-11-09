# Calculators: plan (Phase 11)

Requested 6 November 2026: a large set of calculators in four groups (financial, fitness and health, maths, other), starting with **Speed, Distance and Time**. The list was taken from a typical calculator directory; the tools here are written fresh (own code, own wording, own examples), only the ideas are the same.

## Rules every calculator follows (new ones and the existing ones)

- **Show the equation and the working.** Under the result, a "How this is calculated" panel shows the formula in plain symbols and then the steps **with the visitor's own numbers** (for example `Speed = Distance ÷ Time`, then `150,000 m ÷ 9,000 s = 16.67 m/s`). It uses the shared `workings` prop of `ToolLayout` (`components/tools/ui.tsx`); the maths module returns the `workings` text next to the result so the numbers on screen and in the steps can never differ.
- Everything runs in the browser: no uploads, no network calls, no live data (so no currency or price lookups).
- Pure maths in `lib/tools/`, unit tested against worked examples and edge cases.
- Results are estimates, said plainly. Health tools say they are general information and not medical advice. No rule that changes every year (income tax slabs, for example) unless the owner agrees to update it yearly.
- The usual per-tool steps from `docs/more-tools-plan.md` apply: component key and registry, workbook rows and content, a guide article, browser tests, and the audits.

## Retrofit: show workings on the calculators that exist

EMI, FD, GST, SIP, Lumpsum, Compound interest, Simple interest, RD, Discount, Percentage, Age and Days between dates get a `workings` panel (formula plus their steps). Unit converter shows the conversion factor used.

## Batches

| Batch | Tools | Notes |
|---|---|---|
| **A: Motion and everyday** | **Speed, Distance and Time** (first), Pace calculator, Time calculator (add and subtract times), Hours calculator (hours worked, minutes, pay), Date calculator (add or subtract days, weeks, months from a date) | Share the time-arithmetic code. Pace goes with the fitness group. |
| **B: Loans** | Loan calculator, Auto loan, Mortgage (home loan), Payment calculator, Amortization schedule, Interest rate calculator (find the rate from EMI) | Build on the EMI maths. The schedule is a table. Indian conventions (monthly reducing balance), stated on the page. |
| **C: Growth and planning** | Investment calculator, Retirement calculator, Inflation calculator, Finance calculator (solve for any of present value, future value, rate, periods, payment), Interest calculator (a front page over simple and compound) | Reuse growth and interest modules. Inflation takes the rate the visitor types; nothing is looked up. |
| **D: Money in hand** | Salary calculator (annual, monthly, weekly, daily, hourly), Sales tax calculator (a GST variant, shares the GST maths), Income tax calculator | **Income tax only if the owner commits to updating it every year** (slabs change every Budget). Otherwise a generic "tax on income with slabs you enter" calculator. |
| **E: Health and fitness** | BMI, BMR, Calorie (daily need), Body fat (the US Navy method), Ideal weight, Pregnancy and due-date, Conception date | Published formulas only (BMI = weight ÷ height², Mifflin-St Jeor for BMR, and so on), each named on the page. Clear "not medical advice" note. New category "Health and Fitness". |
| **F: Maths** | Fraction calculator, Random number generator, Triangle calculator, Standard deviation, Scientific calculator | New category "Math Calculators". The scientific calculator needs a safe expression parser (never `eval`). |
| **G: Other** | GPA calculator, Grade calculator, Concrete calculator, Subnet calculator | GPA and grade: percentage and 4.0 and 10-point scales (CGPA to percentage as used in India). Concrete: volume from the shape and a mix ratio. Subnet: IPv4 and CIDR. |

Already on the site (no new work except the workings panel): Mortgage-style EMI, Compound and Simple interest, Percentage, Age, Password generator, Unit converter (the "conversion calculator"), Days between dates, GST.

## Order

1. Shared workings panel and **Speed, Distance and Time** (done first, 6 November 2026).
2. Retrofit the workings panel on the existing calculators.
3. Batches A to G in the order above; each batch is one commit with its tools, guide articles, tests and workbook rows.

## Open questions for the owner

- **Income tax:** build a yearly-updated Indian income tax calculator (and commit to updating it every Budget), or a generic slab calculator?
- **Health tools:** are you happy with the "general information, not medical advice" wording on every health page?
- **Categories:** add "Health and Fitness" and "Math Calculators" as new tool categories (and keep "Finance Calculators" and "Utilities")?
