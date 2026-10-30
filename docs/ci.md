# Continuous checks

Two workflows in `.github/workflows/`.

## Validate (pull requests and every branch except `main`)

Runs as parallel jobs, so the slow browser tests do not hold anything else up:

- **Checks and unit tests** (about 1 minute): workbook validation, `npm audit` on what the site ships, type check, lint, unit tests.
- **Browser tests**, one job per browser, each building the test version of the site (every tool shown as published; never deployed):
  - Chrome and Chrome on a phone profile: accessibility, responsive layout, tools, privacy, SEO audit, keyboard, no-JavaScript, performance, admin.
  - Firefox: the shared browser tests (accessibility, responsive, tools, privacy, admin, keyboard, no-JavaScript).
  - Safari engine (WebKit) and an iPhone profile: the same shared tests, and tools and privacy on the iPhone profile.

The browser jobs have 40 minutes each. They were once a single 15-minute job, which ran out of time as tests were added (30 October 2026); splitting them fixed that.

## Deploy to GitHub Pages (every push to `main`)

Validate, test, build, pre-publish build check, then publish; the publish job only starts if everything before it passed (`docs/failed-builds.md`). It does not repeat the browser tests: run Validate on a branch or pull request first when a change is large.

## Tests that need a special build

These skip in a normal run and are run by hand (commands in the linked docs): the banner and blocked-analytics tests (`docs/analytics.md`) and the ad layout tests (`docs/ads.md`).

## Writing browser tests

Import `test` and `expect` from `./fixtures`, not from `@playwright/test`. Its `page.goto` also waits until the page's JavaScript is running (`<html data-hydrated>`), so tests never type into a page that is still loading. The no-JavaScript test is the one exception, because it turns JavaScript off. CI runs with longer timeouts than a laptop.
