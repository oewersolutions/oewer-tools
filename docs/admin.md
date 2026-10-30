# Admin page

`/admin/` is a static page that edits the workbook straight from the browser through the GitHub API. There is no server: the browser talks to `api.github.com`, and every save is a Git commit.

## How to sign in

1. On GitHub, create a **fine-grained personal access token**: Settings > Developer settings > Personal access tokens > Fine-grained tokens.
2. Limit it to **only this repository**, with **Contents: Read and write** and no other permission. Give it a short expiry.
3. Open `/admin/`, enter `owner/name` and the branch, paste the token and sign in.

The token is held in the page's memory only. It is not put in `localStorage`, `sessionStorage`, cookies, the URL or the repository, and signing out or closing the tab forgets it. A test checks this.

## What the spike does

1. **Verify:** `GET /repos/{owner}/{repo}` confirms the token can see the repository and whether it has push permission.
2. **Read:** `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` gives the file's blob SHA; `GET /git/blobs/{sha}` gives its bytes. The blob API works for files up to 100 MB, so the workbook can grow past the 1 MB limit of the contents API.
3. **Check:** the same validator the build uses (`lib/workbook`) runs in the browser on the downloaded workbook.
4. **Edit:** `exceljs` changes one cell in the browser. Booleans and numbers are stored as such. The edited workbook is validated again, and a change that would make it invalid cannot be saved.
5. **Save:** `PUT /repos/{owner}/{repo}/contents/{path}` with the **SHA of the version that was loaded**. If someone else saved in the meantime, GitHub answers 409 and the page explains it and offers a reload. This is the optimistic concurrency the plan asked for.

A save is a normal commit on the branch, so the deploy workflow rebuilds the site, and Git history is the backup and audit trail.

## What the spike showed

- **It works in the browser.** Reading, validating, editing and saving all run client-side. Excel round-trips cleanly through `exceljs`: after a save, only the edited cell differs.
- **CORS is fine.** `api.github.com` accepts browser requests with an `Authorization` header.
- **Cost:** `/admin/` ships about 1.5 MB of JavaScript (mostly `exceljs`, uncompressed). Only the admin page pays this; the public pages are unchanged. It could be loaded only after sign-in if it matters.
- **Read-only tokens** are detected and the save button stays disabled.
- **Not covered yet** (later tasks): hardening the token handling and a strict Content Security Policy (T5.2), editing whole rows with proper forms (T5.4 and T5.5), a conflict screen that keeps your edit (T5.3), publishing and build status (T5.6), history and restore (T5.7), and a dashboard (T5.8).

## How it is tested

`e2e/admin.spec.ts` runs the page against a pretend GitHub (requests to `api.github.com` are intercepted), so no real repository is touched. It covers sign-in, a wrong token, a valid edit that is saved with the right SHA, an invalid edit that is blocked, a conflict, a read-only token, sign-out, and that the token is never stored. `tests/admin-github.test.ts` and `tests/admin-edit.test.ts` cover the API client and the cell editing.

The admin page is not in the sitemap or navigation, is marked `noindex`, and is disallowed in `robots.txt`.

## Token handling and Content Security Policy (T5.2)

**Where the token lives.** In the page's memory only, by default. The sign-in form has an optional "Keep me signed in if I reload this tab" box. When it is ticked, the token is kept in this tab's `sessionStorage` (never `localStorage` or cookies), so it survives a reload of that tab, is not visible to other tabs, and is gone when the tab closes. It is off by default because anything in storage can be read by a script running on the page; leave it off on a shared computer. If a remembered token is no longer accepted, it is deleted and the sign-in form says why.

**Signing out.** The Sign out button forgets the token, the loaded workbook and the remembered session. The page also signs you out automatically after **30 minutes without a click or key press**.

**Content Security Policy.** After each build, `scripts/add-admin-csp.ts` adds a policy to `/admin/` as a `<meta>` tag, because GitHub Pages cannot send headers. It allows:

- scripts from this site and from the page's own inline start-up scripts **by SHA-256 hash**, so there is no `unsafe-inline` and an injected script cannot run;
- network calls only to this site and `https://api.github.com`;
- styles, fonts and images from this site only, and nothing else (`default-src 'none'`), no plug-ins, no `<base>` changes and no form posts.

The admin page loads no third-party scripts. Tests check the policy, that the whole sign-in and save flow runs without a single violation, that an injected inline script does not run, and that the only other origin the page talks to is `api.github.com`.

**Limits to know about.** A policy in a `<meta>` tag cannot set `frame-ancestors`, so it does not stop another site framing the page; and it cannot be removed once applied, so leaving the admin page for another page reloads that page so the policy does not follow you. The page cannot protect against malware or a malicious browser extension on your own computer, which is why the token should be limited to this one repository with only Contents access, and given a short expiry.

**A start-up quirk.** The framework can start this component twice while the page loads. Resuming a remembered session therefore shares one attempt between both starts, and a failure notice is kept in session storage until you sign in again so it is not lost.
