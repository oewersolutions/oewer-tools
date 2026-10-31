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
- **Not covered yet** (later tasks): hardening the token handling and a strict Content Security Policy (T5.2), editing whole rows with proper forms (T5.4 and T5.5), a conflict screen that keeps your edit (T5.3), and publishing and build status (T5.6).

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

## Safe write workflow (T5.3)

Changes are collected as a **list of pending changes** and saved together as one commit. Each change names the record by its **ID** (the sheet's primary key), not by row number, so it still makes sense if someone else adds or removes rows meanwhile. A change is one of: set a cell (remembering the value the person saw), add a row, or delete a row.

Saving does this, in order (`lib/admin/save.ts`):

1. **Apply and validate.** The changes are applied to the version they were made from, and the full validator runs on the result. If it would leave the workbook invalid (a wrong value, a broken link such as a deleted tag that an article still uses, a duplicate ID), **nothing is sent**; the problems are listed and the pending changes are kept so they can be fixed.
2. **Save with the SHA.** The commit carries the SHA of the version the changes were made from, so GitHub refuses it if anyone saved in between.
3. **If GitHub refuses, rebase.** The page downloads the newest version and applies the same changes to it, then saves again (up to three tries). Changes that touch different cells merge automatically, and the page says so.
4. **If a change clashes, ask.** A change clashes when the cell now holds something other than what the person saw, the record was deleted, or a new ID is already taken. **Nothing is overwritten.** The page shows what is on GitHub now and, for each clash, lets the person choose **keep what is on GitHub** (drop my change) or **use my version** (overwrite theirs). Their other pending edits are never lost. The save then proceeds on top of GitHub's newest version.

Deleting a row that other rows still use (for example a tag that an article carries) is blocked by validation; remove the references in the same save.

Adding and deleting rows is built and tested in the engine; the screens for them come with the spreadsheet manager (T5.4).

Tests: `tests/admin-changes.test.ts` runs the engine and the whole workflow against an in-memory repository that behaves like GitHub (SHA changes on every save, stale SHAs are refused, another editor can save mid-flight). `e2e/admin.spec.ts` covers the screens, including merge, both conflict choices, invalid changes and read-only tokens.

## Spreadsheet manager (T5.4)

After signing in, the page is a manager for every sheet in the workbook.

- **Browse.** A tab for each of the 16 sheets (with live row counts) opens a table of its rows. Search looks in every column. A filter narrows a column that has a small set of values (statuses, true/false, references), and a sort orders by any column. Long sheets are split into pages (25 rows by default, or the `rows_per_page` row of `admin_settings`, between 5 and 200).
- **Edit.** Each row has Edit and Delete buttons. The edit form is built from the schema: a text area for long text, a drop-down for statuses and other fixed choices, true/false for flags, a list of existing IDs for references, and a read-only ID. Only the cells you changed become changes.
- **Add.** Add row opens the same form, with the next free ID filled in (for example `TAG0007`). An ID that is already used is refused.
- **Delete.** Deleting a row that other rows still use, such as a tag an article carries, is allowed into the pending list but flagged at once, and cannot be saved until the references are removed too.
- **Live checking.** Every change is applied to a copy of the workbook and validated straight away. The table shows the workbook as it would be after saving (changed rows are marked), and the pending panel says either "The workbook is valid with these changes" or lists the problems. Saving uses the safe workflow from T5.3.
- **Bulk.** *Export as CSV* downloads the current sheet. *Import CSV* reads a file with the same columns: rows with a new ID are added, rows whose ID exists have their changed cells updated, and rows missing from the file are left alone (an import never deletes). The preview says how many of each, or why the file cannot be used, before anything is added to the pending changes. *Download the workbook* saves the whole `.xlsx`.

Limits: an import file can be at most 2 MB and 2000 rows. Everything runs in the browser and nothing leaves it except the final save to GitHub.

## Content forms (T5.5)

After signing in, the admin opens on purpose-built editors, with **All sheets** (the spreadsheet manager above) one tab away for anything the forms do not cover. Every editor builds the same pending changes as the manager, so the live validation, the safe save and the conflict choices all apply unchanged. Nothing is saved until you press Save.

- **Tools.** One form per tool: name and address (the address follows the name until you edit it), category, tool component (a list of the components that exist in code), status, featured, order and description; then the page content: the how-to text, examples and questions with add and remove buttons, related tools and guides as tick lists; then search settings. Add tool is offered only while a tool component exists that no tool uses yet, because the code for a tool has to be written first.
- **Categories.** Tool categories and article categories, with name, address, description, and for tool categories an order and a show/hide switch; plus search settings.
- **Articles.** Title, address, status, category, author, publication date (set automatically when you publish an article that has none), summary, tags (tick existing ones or create new ones) and the article body as a **block editor**: each block has a type (paragraph, heading, list, image, quote, code, callout), its text, and buttons to move it up or down or remove it; images take alt text and a file path. Blocks are renumbered in the order shown, and saving an existing article refreshes its "updated" date.
- **Search settings.** A list of every page, tool, category and article showing whether it uses its default search text, custom text, or is hidden from search engines, with a form for the title (counted against 70 characters), description (170), canonical address and noindex. Emptying the form removes the custom row.
- **Ads.** The site-wide on/off switch and the placements: name, page type, public slot number (digits only) and an enable switch for each, with add and remove.

Details worth knowing:

- Mistakes show up as you work, not at save time: for example an article marked published with no blocks, a category with no description, or a slot number that is not digits. The Pending changes panel lists them, and Save stays refused until they are fixed.
- Editing something you added in the same session updates the pending addition instead of stacking changes.
- Changing an address (slug) breaks existing links to that page; use the `redirects` sheet when you rename one that is already published.
- The planners that turn forms into changes are plain functions in `lib/admin/forms.ts`, unit tested against the seed workbook, including that the workbook is valid after each kind of edit.

## Publish flow (T5.6)

Saving is publishing: a save commits the workbook to the branch the site is built from, and the deploy workflow then rebuilds and replaces the live site. Content has three states in the workbook (`draft`, `published`, `archived`), so unfinished work is saved without going live by leaving it as `draft`.

- **Before you save.** The Pending changes panel says what the live site will do: which articles, tools, pages and categories **appear**, which are **updated** (including edits to an article's blocks or a tool's questions) and which are **removed**. If nothing visitors can see changes, it says so. It also lists any validation problems, and Save stays refused until they are fixed.
- **Preview.** The article editor has **Preview article**, which renders the article with the site's own typography from what is on screen, before anything is saved, with a "Draft preview" or "Archived article" notice when it applies. (A full preview of a draft on the real site is available locally with `npm run build:preview`.)
- **After you save.** The **Site status** panel follows the update: *Waiting to start*, *Updating the site*, then *Live*, refreshed every few seconds and for up to fifteen minutes. It lists the latest updates with their commit message, time and a link to the run on GitHub, and has a link to the live site.
- **If an update fails** the panel says so, says that **the live site still shows the previous version** (a failed build never replaces it), and explains in plain words which stage failed: the workbook did not pass validation, the checks failed, the site could not be built, or it could not be published (Pages settings). A link opens the run on GitHub for the full log.
- **Token permission.** Reading build status needs **Actions: Read** on the token. Without it, saving works as usual and the panel says what to add instead of showing an error.

The status client is `lib/admin/actions.ts` and the "what changes" comparison is `lib/admin/live.ts`; both are plain functions with unit tests (`tests/admin-publish.test.ts`). The browser tests run the whole flow against a pretend Actions API: waiting, building and live, a failed validation step, a token without Actions access, and the live-site summary.

## History and restore (T5.7)

Git is the backup: every save, and every restore, is a commit that changed the workbook.

- **History panel.** **Show earlier versions** lists the latest 30 commits on the branch that changed the workbook file, newest first, with the commit message, who made it, when, and a link to the commit on GitHub. Reading history needs only the Contents permission the token already has.
- **Restore.** Each version except the latest has **Restore**. A confirmation says which version is about to come back and that content saved after it will be replaced on the live site once it rebuilds. Only after **Yes, restore this version** is anything sent.
- **Restore is a new commit, not a rewind.** The old file is saved on top of the current one with the message "Restore workbook to version abc1234: …". History is never rewritten, so a restore can be undone by restoring the version before it, and the Site status panel then follows the rebuild like any other save.
- **Guards.** The old version is checked against today's rules first; if it is no longer valid (for example the schema moved on), it is not restored and the first problem is shown. It is saved against the current version's SHA, so if someone saved in the meantime GitHub refuses and nothing is overwritten. Restoring a version identical to the current one does nothing. A read-only token cannot restore.
- **Pending changes** in the editor stay where they are and apply on top of the restored version.

Code: `lib/admin/history.ts` (unit tested in `tests/admin-history.test.ts`) and `app/admin/History.tsx`; the browser test confirms nothing is committed before the confirmation and that the restored bytes equal the old version.

## Dashboard (T5.8)

The first panel after sign-in gives an overview without opening any sheet.

- **Content counts.** Tools, articles and pages, each with published, draft and archived numbers, plus totals for tool and article categories, tags, authors and redirects. They come from the workbook as loaded, so they update after a save or a restore.
- **Recent saves.** The last five commits that changed the workbook, linked to GitHub.
- **Latest site update.** The state of the newest deploy run (*Live*, *Updating the site*, *Failed*…), its commit and time, with a link to the run. Without the **Actions: Read** permission this line says so and the rest of the dashboard still works.

Code: `lib/admin/dashboard.ts` (counts, unit tested in `tests/admin-dashboard.test.ts`) and `app/admin/Dashboard.tsx`, which reuses the history and deploy-run clients.

## Pictures in articles (T9.8)

The article editor can upload pictures, so nothing has to be copied into the repository by hand.

- **Where:** **Upload a cover picture** near the top of an article, and **Block N: upload a picture** inside each image block. Both are disabled until the article has a title (its address names the folder) and when the token is read-only, with the reason shown.
- **What happens:** the file is checked by its contents (a renamed SVG or GIF is refused, and so is anything over 25 MB or 80 megapixels), then resized and compressed **in your browser**: a full size and a half-size copy for phones, WebP (JPEG in Safari), lowering the quality a step at a time until each file is about 300 KB, and refusing a picture that stays over 800 KB. The original never leaves your computer.
- **Saved as one commit:** both files go to GitHub through the Git data API in a single commit named "Admin: add cover for <article>", on top of the branch's latest commit and never forced; if someone saved a moment before, it is repeated on top of theirs (up to three times). One commit means one site update, not one per file.
- **Then:** the form shows a preview, the sizes and a link to the commit, and fills in the picture's address. Pictures go live with the next site update; an article that refers to a picture not yet in the repository would fail the build, which is why the picture is saved first and the article after.
- **Removing:** "Remove the cover" clears the cover and its description; the files stay in the repository (Git history keeps everything), and the article goes back to a generated cover. Pictures that are uploaded but never used are harmless.
- **Token:** it needs the same **Contents: Read and write** permission as everything else; the Git data calls are covered by it.
- **Privacy and rights:** pictures become public in the repository and its history. Only upload pictures you own or are licensed to use.
- **The preview** of the saved picture is shown from the browser's memory (the admin's security policy allows `blob:` images for this and nothing else new).

Code: `lib/admin/images.ts` (rules and the resizing, unit tested), `commitFiles` in `lib/admin/github.ts`, and `app/admin/editors/ImageUpload.tsx`.


## The admin app: menu, views, rebuild and users

After signing in with a fine-grained token it shows a full-window app:

- **Menu (left):** Dashboard, Content (Articles, Tools, Categories), Site (Search settings, Ads, Site status), Data (All sheets, History), Team (Users).
- **Top bar:** unsaved-change count, Reload, and **Rebuild site**.
- **Dashboard:** content counts, analytics state, latest site update with its own Rebuild button, recent saves.
- **List views and form views:** every sheet (All sheets) and the Articles, Tools, Categories and Search lists use the same table layout with status pills. A record opens as a form with a breadcrumb, Save/Cancel buttons at the top, and (for sheets) a previous/next record pager. Changes are queued as pending and saved in one commit.

### Rebuild site

Starts the `deploy.yml` workflow on the branch (`workflow_dispatch`), the same build a save triggers. Use it to publish again after a failed update or when nothing changed. The Site status page follows the run.

### Users

Users are the repository's GitHub collaborators. **Users → New user** takes a GitHub username and a role (Editor = write, Viewer = read, Admin) and sends GitHub's invitation. Pending invitations can be cancelled and members removed. Each person signs in with their own token, so saves are recorded under their name.

### Token permissions

| Use | Permission |
| --- | --- |
| Edit and save | Contents: Read and write |
| See site updates, Rebuild site | Actions: Read and write |
| Add or remove users | Administration: Read and write |

Only the permissions you need must be granted; the page explains what is missing when GitHub refuses.
