# AdSense: readiness and switching on (T7.7)

I cannot apply for you or promise approval; Google decides, and it needs your Google account. Everything on the site side is ready and switched **off**. This is the plan from here.

## What the site already does

- **`/ads.txt`** is published automatically. Once `adsense_publisher_id` is set it contains the one line AdSense expects (`google.com, pub-…, DIRECT, f08c47fec0942fa0`); until then it only says no account is connected.
- **Account tag.** With the publisher ID set, every page carries `<meta name="google-adsense-account" content="ca-pub-…">`. Google can use it to confirm you own the site; it loads nothing in visitors' browsers.
- **Ads only with permission.** The Google ad script is not loaded, and no ad box is shown, until a visitor chooses **Ads** in the privacy panel. Declining, or no answer, means no script, no cookies from Google ads and no empty box. Withdrawing later reloads the page without ads.
- **Non-personalised ads** are requested (`requestNonPersonalizedAds`), so ads follow the page, not the visitor's history. Revenue per visit can be lower than with personalised ads; that is a deliberate privacy choice you can revisit.
- **Placement rules** (`docs/ads.md`): never inside a tool or next to its controls, none on the legal or contact pages, labelled "Advertisement", reserved space so nothing jumps.
- **Privacy Policy** already describes advertising, and the privacy panel and footer link (**Privacy choices**) appear when ads are switched on.
- **Tested:** `e2e/ads-consent.spec.ts` (commands inside the file) checks the whole chain with Google's scripts stubbed: nothing loads before a choice, declining loads nothing, allowing loads one script and requests the ads once, the tool still works, withdrawing removes the ads, and the panel passes the accessibility checks and fits a phone.

## Is the site ready to apply?

An honest read, from what is in the workbook today:

| | Now | Comment |
|---|---|---|
| Domain you own, HTTPS | Yes: `oewer.in` | Required |
| Privacy Policy, Terms, Contact, About | Yes, published | Have them reviewed (`docs/legal-pages.md`) |
| Working, useful tools | 28 tools | A strength: real utility, not filler |
| Original written content | 6 seed articles | **The weak spot.** Google gives no fixed number, but applications are commonly refused for "low value content" when a site has only a handful of short pages. Aim for a clearly substantial set of original, accurate guides (T4.5) before applying, written for people, not for search engines |
| Clear navigation, no broken pages | Yes | Audited (`docs/audit.md`) |
| Consent for ads | Yes, built in | See the EU note below |
| Site age and traffic | New | AdSense has no official traffic minimum in most countries, but a site that already has real visitors and a few weeks of history tends to fare better. Build some first |

My suggestion: write the articles, let the site collect some visitors and appear in Google Search, then apply.

## Steps

1. **Content first.** Add original articles in the admin (**Articles**). Each should answer a real question, be accurate, and be yours (not copied or auto-generated). Keep the tools-plus-guides pairing; it is what makes the site useful.
2. **Search Console and Analytics.** Verify `oewer.in` in Google Search Console, submit `https://oewer.in/sitemap.xml`, and add the GA4 Measurement ID (`docs/analytics.md`).
3. **Apply.** Sign in at adsense.google.com with your Google account, add `oewer.in` and fill in the payment and tax details (these go to Google, never into this site). Google asks you to confirm ownership: the `ads.txt` line and the account tag need your publisher ID first, so do step 4 as soon as you have it.
4. **Publisher ID.** In the admin: **All sheets → site_settings**, set `adsense_publisher_id` to your `ca-pub-…` ID (it is public; never put a password or key here). Save. The next deploy publishes `ads.txt` and the account tag. Ads stay off because `ads_enabled` is still false.
5. **Wait for review.** It can take days to weeks. Do not change the site's core structure meanwhile, and never click your own ads at any point (that gets accounts banned).
6. **After approval, create ad units.** In AdSense create responsive display ad units and copy each **slot number** (digits). In the admin **Ads** page, paste a slot ID into each placement you want, tick **Enable**, then tick **Show ads on the site**. Start with `below_tool` and `in_article`, and add others only if the pages feel uncluttered.
7. **Check as a visitor.** Open the site in a private window, choose **Ads** in the panel, and look at a tool page, an article and the home page on a phone and a laptop. Make sure no ad sits where someone might tap it by accident.
8. **Switch off any time:** untick **Show ads on the site** and save. Every ad disappears at the next deploy.

## The consent point you must decide (EU, UK, Switzerland)

For visitors in the European Economic Area, the UK and Switzerland, Google requires publishers to use a **Google-certified consent management platform (CMP)**. The privacy panel built into this site records a real, informed choice and loads nothing before it, but it is **not** a certified CMP. Options, in order of simplicity:

1. **Use Google's free consent message** (AdSense → Privacy & messaging). It is certified. If you turn it on, tell me and I will make this site's ad choice defer to it for those regions.
2. **Serve ads outside the EEA/UK/Switzerland only.** Not practical on a static host without geo-detection.
3. **Leave ads off** until one of the above is in place, and keep analytics only.

Until you choose, treat ads as not ready for a European audience. If your visitors are almost all in India, this matters much less, but the policy applies to any visitor in those regions.

## Rules to follow once ads are on

- Never click your own ads, ask others to, or offer anything for clicks.
- Do not place ads on pages with little content, or near buttons so they are tapped by mistake; the layout rules already keep ads away from the tools.
- Keep the Privacy Policy accurate; if you change what the site does, change the policy.
- Check AdSense's policy center now and then; policies change.
- Income is not guaranteed. Expect little until the site has steady traffic.
