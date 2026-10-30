# Analytics (T6.1)

The site uses **Google Analytics 4** to see which pages and tools are used and, later, which pages earn ad revenue. It is switched off until you turn it on, and it never changes how the site works.

## Turning it on

1. Create a GA4 property and a web data stream for the site at analytics.google.com. Copy the **Measurement ID** (looks like `G-ABC123XYZ4`).
2. In the admin, open **All sheets → site_settings**, find `analytics_measurement_id` and paste the ID into `setting_value`. Save.
3. The site rebuilds. Analytics still sends nothing until a visitor has accepted analytics (see the consent banner below).

An empty value switches analytics off. Anything that is not a valid ID is rejected by validation, so a typo cannot go live unnoticed.

## What is sent

- **Page views**, one per page shown (the site moves between pages without reloading, so these are sent explicitly).
- **`tool_open`**: once when a tool page is shown.
- **`tool_complete`**: once per visit, the first time the tool shows a result *after the visitor has typed, chosen or clicked*, so a calculator's starting example does not count.
- Both tool events carry only `tool_name`, the tool's address such as `emi-calculator`. Never the text, numbers, files or settings the visitor used.

## Privacy and safety

- Nothing loads without a Measurement ID **and** consent. Declining, no answer, or blocked storage all mean no analytics.
- Advertising storage and personalisation stay **denied**; only measurement is granted. Google signals are off. (Ads are handled in T7.7.)
- Withdrawing consent stops sending immediately.
- If the Google script is blocked or down, the site behaves exactly the same: every call is a safe no-op.
- The automated privacy tests still run with analytics off and also check that no request to Google is made when no ID is set, even if consent is stored.

## Code

`lib/analytics.ts` (consent, loading, events; unit tested in `tests/analytics.test.ts`), `components/Analytics.tsx` (loads after consent, page views), `components/tools/ToolEvents.tsx` (wraps each tool page and decides when a tool has completed; each tool reports its result with `useReportResult`). The ID check is part of workbook validation.

Checked by hand with a test ID and a stubbed Google script: one `page_view`, one `tool_open` and, after editing a field twice, a single `tool_complete`; declined consent made no request.

## Consent banner (T6.2)

- **When it shows.** Only when the site has a valid Measurement ID and the visitor has not chosen yet. With no ID there is no banner, no footer link and no analytics. It never shows on the admin page.
- **What it says.** In plain words: analytics counts visits and tool names, sets cookies, sends anonymous figures to Google, and never sees what is typed or chosen; declining changes nothing about how the site works. It links to the Privacy Policy once that page is published.
- **Choices.** **Allow analytics** and **Decline** are equally prominent. The banner sits at the bottom of the screen without blocking the page, so tools stay usable while it is open. The choice is stored in the browser (`oewer-consent`) and the visitor is not asked again.
- **Changing your mind.** A footer link, **Analytics settings**, reopens the panel with the current choice, moves keyboard focus into it, and offers Allow, Decline and Close. Declining stops events at once and deletes the `_ga` cookies (on the site's host and its parent domains).
- **Nothing before the answer.** No Google script is requested and no cookie is set until the visitor allows analytics.
- **Ads later.** Advertising consent for AdSense (T7.7) will be added to the same panel; until then advertising storage stays denied.

### Testing it

The normal build has analytics off, so the banner tests need a build with an ID. They use a test ID and a stub in place of Google's script, so nothing leaves the machine:

```bash
NEXT_PUBLIC_ANALYTICS_ID=G-TEST123456 npm run build && CONSENT_E2E=1 npx playwright test e2e/consent.spec.ts
```

`NEXT_PUBLIC_ANALYTICS_ID` overrides the workbook setting for that build only; the deploy workflow does not set it. The tests check: asked first and nothing loaded before the answer, the tool works while the banner is open, accept loads one script and sends a page view, decline loads nothing and is remembered, the footer link reopens it with focus inside, withdrawing stops events and removes cookies, the admin page has no banner, and the banner has no accessibility violations. They are skipped in a normal run. Run `npm run build` again afterwards to go back to the real site.
