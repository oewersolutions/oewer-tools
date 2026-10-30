# Admin page (spike, T5.1)

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
