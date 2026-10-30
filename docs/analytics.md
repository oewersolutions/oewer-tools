# Analytics (T6.1)

The site uses **Google Analytics 4** to see which pages and tools are used and, later, which pages earn ad revenue. It is switched off until you turn it on, and it never changes how the site works.

## Turning it on

1. Create a GA4 property and a web data stream for the site at analytics.google.com. Copy the **Measurement ID** (looks like `G-ABC123XYZ4`).
2. In the admin, open **All sheets → site_settings**, find `analytics_measurement_id` and paste the ID into `setting_value`. Save.
3. The site rebuilds. Analytics still sends nothing until a visitor has accepted analytics (the consent banner arrives in T6.2; the choice is stored in the browser under `oewer-consent` as `{"analytics": true}`).

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
