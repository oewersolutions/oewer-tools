# Custom domain, HTTPS and restore (T7.5)

The site is live at **https://oewer.in**. AdSense needs a domain you own, and a custom domain also keeps addresses stable if the hosting ever changes.

## How it is set up

- **Pages:** Settings → Pages: Source *GitHub Actions*, Custom domain `oewer.in`, *Enforce HTTPS* on. GitHub issues and renews the certificate (it covers `oewer.in` and `www.oewer.in`).
- **DNS:** four `A` records for the apex `oewer.in` pointing at GitHub Pages (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) and a `CNAME` for `www` pointing at `oewersolutions.github.io`. IPv6 `AAAA` records are optional and not set.
- **Build settings:** repository variable `SITE_URL` = `https://oewer.in`. There is **no** `BASE_PATH`: on a custom domain the site sits at the root. (`SITE_URL` wins over the workbook's `site_url`, which also says `https://oewer.in` so the two agree.)
- **No CNAME file** is needed in the repository: with Actions-based publishing the domain is held in the Pages settings.

## What was verified (30 October 2026)

| Check | Result |
|---|---|
| `http://oewer.in/` | 301 to `https://oewer.in/` |
| `http://www.oewer.in/`, `https://www.oewer.in/` | 301 to `https://oewer.in/` |
| `https://oewersolutions.github.io/oewer-tools/…` (home, a tool page, the admin) | 301 to the same path on `oewer.in` |
| Certificate | approved, HTTPS enforced, valid to 28 Jan 2027 (renews automatically) |
| Canonical links, Open Graph URLs, sitemap, `robots.txt`, RSS | all use `https://oewer.in` |
| Assets and chunks | load from the root; no `/oewer-tools` paths remain |
| Build safety | the deploy's pre-publish check passes with this configuration |

Old `github.io` links, including any already shared or indexed, keep working through the redirect.

## Things that changed because of the move

- The admin is now at **https://oewer.in/admin/**. A remembered "keep me signed in" token belongs to one address, so sign in again there. The admin page remembers nothing from the old address.
- In Google Analytics, use `oewer.in` for the data stream, and in Search Console add `oewer.in` as the property (a *Domain* property verified by DNS is best), then submit `https://oewer.in/sitemap.xml`.
- If you ever change the domain again, change it in Settings → Pages, update DNS, and update the `SITE_URL` variable; the next deploy fixes every address in the site.

## Restore from Git history, verified on the real repository

The admin's History panel was run against the real repository on a throwaway branch (deleted afterwards; `main` and the live site were not touched):

1. Two test edits were saved through the same safe-write code the admin uses, so the file had two new versions.
2. The history listed them above the real commits.
3. Restoring the version from before the edits made the workbook **byte-for-byte identical** to the original (same file hash), as a *new* commit on top; nothing was rewritten.
4. Restoring the first test edit worked too, and the history only grew (it never lost entries).
5. Restoring the oldest commit (from Phase 1, before the schema changed) was **refused** as no longer valid, which is the safety check working: it will not bring back a file the site could not build.

Practical consequence: very old versions may not be restorable after the schema moves on. Recent ones are. Git still keeps every version, so an old file can be downloaded from GitHub and migrated by hand if ever needed (`docs/schema-versioning.md`).
