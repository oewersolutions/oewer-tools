# Ad placements (T7.2)

Ads are **off** and nothing about the pages changes until you switch them on. This task adds the places ads can go and the rules around them. Serving real ads, the AdSense script and ad consent come with T7.7, after AdSense approval.

## Where an ad can go

| Page type | Placement | Where |
|---|---|---|
| `home` | `top_banner` | Below the "at a glance" strip |
| `home` | `mid_page` | After "Why OEWER Tools" |
| `tool_category` | `list_bottom` | After the list of tools |
| `tool` | `below_tool` | Below the tool, before "How to use" |
| `blog_index` | `list_bottom` | After the articles |
| `blog_post` | `in_article` | After the third paragraph or block |

These are the rows in the `advertisements` sheet (edit them in the admin under **Ads**). A placement name the pages cannot show, or an enabled placement with no slot number, is rejected by validation with a message listing what is available.

## Rules the layout follows

- **Never inside a tool or next to its controls.** The tool ad sits below the whole tool with at least 32px clear of every button and field.
- **No ads on the About, Contact, Privacy and Terms pages, the 404 page or the admin.** Those page types have no placements.
- **Short articles get none.** An article needs at least 6 blocks. The ad goes after the third block, moves down one if that is a heading (so it never separates a heading from its text), and is never in the last two blocks.
- **Always labelled "Advertisement"**, in a box with space reserved (250px tall) so the page does not jump when an ad loads. Never sticky, never over content, never a pop-up.
- **Nothing when off.** An unset or invalid setting shows nothing at all, not an empty box.

## What must be set for an ad to show

All four: `ads_enabled` = true (Ads page → "Show ads on the site"), `adsense_publisher_id` set in `site_settings` (looks like `ca-pub-1234567890123456`), the placement **enabled**, and its **slot ID** (digits). The publisher ID and slot IDs are public values from your AdSense account, never a password or key.

Until T7.7 adds the AdSense loader, setting all four reserves the labelled space but no ad appears, so leave ads off for now.

## Checking the layout

A normal build shows no ads. A preview build fills every supported placement with an "Ad space (preview)" box, with no ad code, so layouts can be checked on desktop and mobile before there is an account:

```bash
OEWER_PREVIEW_ADS=1 OEWER_PREVIEW_ALL_TOOLS=1 npm run build && ADS_E2E=1 npx playwright test e2e/ads.spec.ts
```

The preview build refuses to run in the deploy workflow. The tests check, on desktop and a phone, that each slot is labelled, fully on screen, tall enough, not sticky, with no sideways scrolling, that the tool ad is clear of the controls, the article ad position, that the boxes pass the accessibility checks, and that the legal pages and admin have none. Run `npm run build` again afterwards to go back to the real site.

Code: `lib/ads.ts` (rules, unit tested in `tests/ads.test.ts`), `components/AdSlot.tsx`.
