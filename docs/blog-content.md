# Writing articles

Articles live in two sheets: `posts` (title, slug, excerpt, category, author, status, dates) and `post_blocks` (the body, one row per block, in `sort_order`).

## Publishing

- `draft` and `archived` posts are never built. Only `published` posts get a page, appear in the blog, search, sitemap and category pages.
- A published post needs a `published_at` date and at least one block.
- Optional SEO overrides go in `seo_metadata` (entity type `post`).

## Block types

| `block_type` | `content` | Notes |
|---|---|---|
| `paragraph` | Text | Supports `**bold**`, `*italic*`, `` `code` `` and `[links](https://…)`. |
| `heading` | Text | Becomes a section heading with an anchor. Articles with three or more headings get an "In this article" list. |
| `list` | One item per line | Each line supports the inline formatting above. |
| `quote` | Text | A pull quote. |
| `code` | Text | Shown as a code block, never executed. |
| `callout` | Text | A highlighted note. |
| `image` | **Alt text** (required) | Also set `asset_path`, for example `/images/blog/my-article/chart-1600.jpg`, and optionally a `caption`. See Images below. |

## Rules that keep articles safe

- No HTML. Everything is rendered as plain elements, and `<` in the text is shown as text.
- Links must be site paths (`/tools/`) or `https://` addresses. Anything else is shown as plain text.
- A cell cannot start with `=`, `+`, `-` or `@`, because spreadsheets treat that as a formula.
- Each block is at most 8000 characters.

## Images

Every article can have a **cover image** and any number of **pictures in the text**.

- **Cover image** (columns `cover_image` and `cover_alt` on `posts`): the picture shown at the top of the article, on its card in every list, and when the article is shared on social networks. **`cover_alt` is required whenever there is a cover**: describe the picture for people who cannot see it. With no cover, the site draws a generated one, so an article never looks empty.
- **Pictures in the text:** an `image` block. Its `content` is the alt text (required), `asset_path` is the file, and the optional **`caption`** (up to 200 characters) is shown under it.
- **Files:** put them in `public/images/blog/<article-address>/` and refer to them like `/images/blog/my-article/cover-1600.jpg`. Only **JPG, PNG and WebP** are accepted; SVG is refused because it can carry scripts. (You do not have to do this by hand: the article editor's **Upload** buttons resize, compress, name and save the files for you; see below.)
- **Two sizes, one name:** name a picture with its width, like `cover-1600.jpg`, and put smaller copies next to it (`cover-800.jpg`). The site finds them by name and gives phones the small one. A picture with no smaller copies is still fine, just heavier on a phone.
- **Sizes:** aim for 1600 pixels wide for the cover and 1200 for pictures in the text, under about 300 KB each (JPG or WebP at roughly 80% quality). The site reads each file's real width and height, so the page keeps the right space while it loads and nothing jumps.
- **Safety:** `npm run export` and `npm run build` fail if a cover or a picture refers to a file that is not there, so a broken image can never be published. Write alt text that says what the picture shows; keep captions short.
- **Uploading from the admin:** in an article, **Upload a cover picture** (and **Upload a picture** inside each image block) takes a JPG, PNG or WebP of up to 25 MB, checks it is really a picture, then **resizes and compresses it in your browser** (cover: 1600 and 800 pixels wide; inside the text: 1200 and 600; never enlarged; WebP, or JPEG in Safari; aiming for about 300 KB). Only the shrunken copies are sent, in **one commit** to `public/images/blog/<article-address>/`, named `<cover or the file's name>-<six letters>-<width>.<webp or jpg>`, and the address of the full-size copy is put in the form. The six letters come from the picture itself, so uploading the same picture twice makes no duplicate. You then write the description (required for a cover), and press **Save**: the form saves straight to the site (one commit), with no separate pending step.
- **The sample covers** were generated placeholders (`npx tsx scripts/make-seed-covers.ts` redraws them). Every article now has a real photo instead, described next.

### Photos from Wikimedia Commons (every article)

Every article has a cover photo that shows its subject, and most have one picture with a caption in the text. They come from Wikimedia Commons and are openly licensed (Public domain, CC0, CC BY or CC BY-SA; never NC or ND). Each article ends with an **Image credits** line that names every picture, its author and its licence, with links; a picture in the text also has the credit in its caption. Keep these lines: CC BY and CC BY-SA require them.

- **`content/images/credits.json`** records, for each picture, the Commons page, the author, the licence and the files made from it.
- **`content/images/text.json`** holds the description (alt text) of each picture and the caption of each picture in the text.
- **Finding and fetching** (needs internet): `npx tsx scripts/commons-images.ts search queries.json sheet.png` searches Commons and draws a contact sheet of the licence-checked candidates; `npx tsx scripts/commons-images.ts fetch "File:Name.jpg" <article-address> <cover|figure>` downloads one into `public/images/blog/<article-address>/` and records its credit. It refuses other licences, files that are not JPEG, and pictures narrower than the size needed.
- **Preparing:** `npx tsx scripts/shrink-images.ts` crops covers to 16:10, limits pictures in the text to 4:3, scales each to the width in its file name (1600 and 800 for covers, 1200 and 600 for pictures in the text) and saves lighter JPEGs. Run it once on freshly fetched files.
- **Putting them in the articles:** `npx tsx scripts/apply-article-images.ts` sets each cover and its description, adds the picture in the text after the first paragraph under the first heading, and writes the credits line. Running it again replaces its own earlier blocks.
- **Adding a picture for a new article:** fetch, shrink and apply as above, after adding the article's entries to `content/images/text.json`. Check that the photo really shows what the article is about, and write alt text that says what it shows. If you would rather use your own photo, upload it in the admin as described above, and keep the credit line only for pictures that need one.

## Categories, tags and authors

- **Categories** (`blog_categories`): each article has one. A category page exists only while it has a published article.
- **Tags** (`tags` and `post_tags`): an article can have several. A tag page at `/blog/tag/<slug>/` exists once a published article uses the tag. Tag pages with fewer than two articles are kept out of search engines and the sitemap, because they are thin.
- **Authors** (`authors`): the page address is made from the display name, so "OEWER Team" is `/blog/author/oewer-team/`. Two authors whose names make the same address, or a name with no letters or numbers, fail validation. The bio is shown on the author page and under each article. Renaming an author changes their page address.
- **RSS**: `/feed.xml` lists the published articles, newest first.

## Draft, published and archived

| `status` | Has its own page | Listed (blog, categories, tags, authors, home, search, feed, sitemap) |
|---|---|---|
| `draft` | No | No |
| `published` | Yes | Yes |
| `archived` | Yes, with an "Archived article" notice and `noindex` | No |

- Archive an article instead of deleting it. Its address keeps working, so links from other sites and old bookmarks do not break, but it stops being promoted and search engines are asked to drop it.
- To remove an article completely, set it to `draft` and add a row to `redirects` pointing its address at a replacement.
- **Previewing drafts:** `npm run build:preview` also builds a page for each draft, marked "Draft preview" and `noindex`, so you can read it before publishing. Draft pages are not listed anywhere, so open the address directly. This build must never be deployed; the deploy workflow refuses it.

## Related tools and articles

- **Tools for an article:** link an article to a tool from the tool's side, with a `guides` row in `tool_settings` (see `docs/tool-content.md`). The tool page lists its guides, and the article shows a "Try it yourself" card for each tool that lists it. One list keeps both directions in step.
- **Related articles:** "Keep reading" is chosen automatically, never by hand. Articles that share the most tags come first, then articles in the same category, then the newest. Only published articles are suggested, and the article itself never is. Tag your articles well to improve the suggestions.
