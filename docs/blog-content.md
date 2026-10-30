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
| `image` | **Alt text** (required) | Also set `asset_path`, for example `/assets/emi-chart.png`. |

## Rules that keep articles safe

- No HTML. Everything is rendered as plain elements, and `<` in the text is shown as text.
- Links must be site paths (`/tools/`) or `https://` addresses. Anything else is shown as plain text.
- A cell cannot start with `=`, `+`, `-` or `@`, because spreadsheets treat that as a formula.
- Each block is at most 8000 characters.

## Images

Put the file in `public/assets/` and refer to it as `/assets/<file>`. `npm run export` and `npm run build` fail if a block refers to a file that is not there, so a broken image can never be published. Write alt text that describes the image for people who cannot see it.

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
