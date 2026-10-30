# Legal and contact pages (T7.1)

Four pages are published from the `pages` sheet: **About**, **Contact Us**, **Privacy Policy** and **Terms of Use**. They are linked from the footer (the navigation sheet decides where) and are edited like any other page, in the admin under **All sheets → pages**.

- **Contact email:** `oewersolutions@gmail.com`, set in `site_settings → contact_email` and written in the Contact, Privacy and Terms pages as a `mailto:` link. If it ever changes, search the three pages for the old address as well as the setting. A test fails if `example.com` appears anywhere in a page.
- **Privacy Policy** describes what the site really does: tools run in the browser and nothing is uploaded; one local-storage entry remembers the analytics choice; Google Analytics only after **Allow analytics**, with the exact kinds of figures collected; how to change the choice (footer **Analytics settings**) and that declining removes the cookies; Google AdSense advertising; GitHub Pages hosting logs; self-hosted fonts; what happens to emails; rights and deletion requests; children; changes.
- **Terms of Use** covers acceptable use, that results are estimates and **not financial, tax, legal or professional advice**, that users keep their own content, our content, availability, limits of responsibility, ads and links, and changes.
- **Dates:** both legal pages start with "Last updated: …". Update the date whenever you change them.
- **Markdown:** these pages may use `mailto:` links with a plain address (nothing else after the address); other links must be site paths or `https://`.

The wording lives in `scripts/site-pages.ts` (used by the seed workbook and used to load the real workbook for launch). After launch the workbook is the source of truth; edit it in the admin, not that file.

`tests/legal-pages.test.ts` guards the real workbook: the four pages are published, have no placeholder text, use the real email, the privacy policy mentions each thing the site does, the terms carry the not-advice notice and link to the privacy policy, and no link in these pages is silently dropped.

## Before launch: please check

I am not a lawyer. These pages are a careful, plain-language draft written to match how the site actually works, but they are not legal advice. In particular please have someone qualified review:

- **Governing law and who is the operator.** The terms do not name a legal entity, country or court. Add them if you operate as a registered business.
- **Data protection law that applies to your visitors** (for example India's DPDP Act, the EU/UK GDPR). The policy lists rights and a contact route but does not name a data controller or a grievance officer; some laws require one.
- **Advertising wording.** When AdSense is switched on (T7.7), check the Advertising section against Google's current publisher policies, which also require a consent tool for visitors in the EU, UK and Switzerland.
