# Design system (T9.1)

The approved look is in `docs/design-preview/` (open `index.html`). This page is the rulebook for building it. Everything lives in `app/globals.css`; the font is set in `app/layout.tsx`.

## Font

**Poppins**, self-hosted at build time by `next/font` (visitors make no request to Google), in three weights only: **400** regular, **500** medium, **600** semibold. Each extra weight is another file every visitor downloads, so do not add 300 or 700; use 500 or 600 and size instead. Headings use the same family (`font-display` is an alias of `font-sans`).

Poppins is wide. Keep lines of text near 65 characters, use generous line height (1.65 to 1.85 for reading text), and keep headings tight (the base style already sets negative letter spacing on `h1` to `h3`). Form fields stay at 16px so phones do not zoom in on them.

## Colour

| Token | Value | Use |
|---|---|---|
| `ink` | `#0e1513` | Text, primary buttons |
| `ink-2` | `#2a3532` | Body text on tints, nav |
| `muted` | `#5a6764` | Secondary text, meta (passes AA on white and on `surface`) |
| `line` | `#e4e8e7` | Borders and rules |
| `surface` | `#f5f7f6` | Quiet panels, bands, the old `cream` |
| `brand` / `brand-800` | `#174f49` | The one accent: links, focus, highlights, hover on buttons |
| `tint` | `#e9f2f0` | Pill and callout backgrounds |
| `brand-50` to `brand-950` | green scale | Shades of the accent, dark sections |
| `gold-*` | warm gold | **Retired.** Only tiny touches on dark backgrounds; never text on white |

White is the page background. Do not add new colours; if something needs emphasis, use ink, the green accent or the tint.

## Type scale (utilities)

`t-display` (hero, up to 4.25rem), `t-title` (page titles), `t-heading` (section headings), `t-subheading` (card titles), `t-lead` (intro text, muted), `t-meta` (dates, read time), `t-eyebrow` (small uppercase label). All sizes are fluid, so a phone gets a smaller heading without extra classes. Use these instead of one-off `text-*` sizes on headings.

## Parts

| Class | What it is |
|---|---|
| `btn` | The primary button: ink, rounded, turns green on hover |
| `btn btn-ghost` | Outlined button |
| `btn btn-light` | White button for dark backgrounds |
| `pill` | Small green-tint label (a category) |
| `card` | Thin outline, 1rem corners, no shadow |
| `card-link` (or `a.card`) | Hover: outline turns ink and lifts 2px |
| `panel` | A larger outlined container, 1.5rem corners |
| `rule` | A thin top border |
| `hero-bg`, `hero-grid` | The dark green hero field and its faint grid (decorative) |
| `band-bg` | The quiet grey band behind an inner page's title |

Radius: cards 1rem, panels 1.5rem, buttons and fields 0.75rem. Shadows are nearly flat: structure comes from thin lines. Hover transitions take 0.2s and are switched off for visitors who ask for reduced motion.

## Focus and contrast

Keyboard focus is a 2px green outline with 3px offset (white on dark sections, via `.on-dark` or inside `.hero-bg`). Do not remove outlines. Every text and background pair must pass WCAG AA; the accessibility tests (axe, on every page) fail the build if one does not.

## Rules of thumb

- One idea per section; generous space (sections 4 to 6rem apart).
- Large confident headings, small quiet meta text.
- Images lead where there are images; never decorate with stock clutter.
- No new shadows, gradients or colours without a reason written in this file.
- Use the shared parts above; if a new part is needed, add it here first.

## Moving the old pages over

The old token names (`brand-*`, `gold-*`, `cream`, `font-display`, `shadow-soft`, `shadow-lift`) still work, now mapped to the new look, so pages move over one task at a time (T9.2 header and footer, T9.3 home, T9.4 tools, T9.5 and T9.6 blog, T9.9 static pages). Until a page is moved it may mix old layout with the new type and colours. When T9.10 finishes, remove the unused `gold-*` and gradient helpers.

## Header and footer (T9.2)

- **Header** (`components/Header.tsx` supplies the data, `components/HeaderBar.tsx` is the bar): a slim 72px bar that stays at the top while scrolling. Logo on the left; the main menu in the middle (from the workbook's `navigation` sheet, location `header`, with the current section underlined and `aria-current="page"`); on the right a search button and the black **All tools** button.
- **Search** opens in the browser's own modal dialog: focus moves to the field, Tab stays inside, Escape closes it and focus returns to the button. Pressing `/` anywhere (except while typing in a field) opens it too. Results appear under the field, and choosing one goes to the page and closes the dialog. The home page and the 404 page keep their large inline search field.
- **On a phone** the menu links sit behind a menu button (`aria-expanded`), close again on choosing a page or pressing Escape, and the search button stays in the bar.
- **Footer** (`components/Footer.tsx`): the logo and a one-line promise; **Tools** (the categories), **Company** (the header and footer menus, without Tools) and **Legal** (the footer_legal menu, plus **Analytics settings** or **Privacy choices** when they apply); a thin rule; the copyright and the contact email from `contact_email`. All of it comes from the workbook, so changing a menu or the email in the admin changes the footer.

Two Safari details are handled on purpose: Safari does not focus a button when it is clicked (so the search button is given focus back explicitly), and it does not focus a link when the mouse is pressed on it (so the search results keep the field focused while the mouse is down; before this fix, results could not be clicked in Safari).

## Home page and cards (T9.3)

The home page (`app/page.tsx`) follows the approved preview:

1. **Hero:** a dark green field, a small eyebrow, one large headline, one short paragraph, the search field, three popular tools, and three plain facts. No picture and no sample card.
2. **Featured tools:** four cards that lead with a real example result (the featured tools first, topped up with others if fewer than four are marked featured).
3. **Browse:** one tile per category with its tool count.
4. **Why:** four plain columns on a quiet grey band, then the at-a-glance numbers (tools, categories, files uploaded, accounts needed).
5. **Guides:** the three latest articles with covers.
6. **Good to know:** the questions as a calm list, with the same structured data as before.
7. **Closing call to action** on the dark field.

Ad slots keep their two home placements (`top_banner` after the featured tools, `mid_page` after the "why" band).

Shared parts that changed with it, so every page using them changes too:

- `ToolCard` shows the category pill, the name, a two-line summary and, at the bottom, a real result from the tool's own maths (`lib/tool-examples.ts`) so the number can never disagree with the tool. Tools without an example say "Open".
- `PostCard` is image-led: a cover, then the category, date and reading time, the title and a two-line summary.
- `Cover` (`components/Cover.tsx`) draws a generated cover from the article's address, the same each time. It is a stand-in until articles carry their own cover image (T9.7).
- `SectionHeading` is the small label, large heading and link pattern used in every section.

## Tools pages (T9.4)

- **Title band** (`PageBand` in `components/layout.tsx`, used by every inner page): a quiet grey band with breadcrumbs, a small green label, a large title and a muted intro. No icon tile any more.
- **Tools index:** the band holds the large search field and category chips that jump down the page; each category is a section with its tool count, name, description, a "View all" link and a row of four tool cards.
- **Category pages:** the same band, then the category's tools in the card grid, an ad slot at the bottom, and "More categories".
- **Tool page:** the band, three outline badges (Free, No sign-up, Runs in your browser), then the tool in two panels. The left panel holds the inputs. The calculators (`ToolLayout dark`) show the answer in a dark green panel with large white type; tools that handle images or text use a light grey result panel, so pictures and text are not on a dark background. Below the tool, in this order: how to use (reading column), examples as cards, questions as an open-and-close list (structured data unchanged), guides, related tools.
- **For the tool components:** `ToolLayout` takes `dark` for calculators; `Results` reads the same setting, so it picks white or ink text itself. Tools that need other result content use the light panel by default.

## Blog listings (T9.5)

All four listings (the Articles index, a category, a tag and an author) share `components/BlogHeader.tsx` and the same card grid:

- **Header:** breadcrumbs, a small label (Category, Tagged, Author), a very large centred title, an optional intro, a thin rule with the years of the articles on the left and the article count on the right, and category chips. **All** and each category that has articles are chips; the one being shown is filled ink and marked `aria-current="page"`. Tag and author pages show no current chip.
- **Grid:** three columns on a laptop, two on a tablet, one on a phone, with the image-led `PostCard`. The old dark "Latest" feature block is gone: every article is a card of the same size, newest first.
- **Below the grid:** the `list_bottom` ad slot (index only), then "Browse by topic" with the tags and the RSS link.
- **Page title:** the index is now titled **Articles** (the menu still says Blog and the address is still `/blog/`).
- **Covers:** until an article has its own cover image (T9.7), `Cover` draws a generated one. Its colours follow the article's number (POST0003 is always the third palette), so neighbouring articles never look the same; the rings are placed from the article's address.
- **Growing:** the listings show every article on one page. If the blog grows past about 30 articles, add paging or a "load more" step.

## Article page (T9.6)

`app/blog/[slug]/page.tsx`, top to bottom:

1. The draft or archived notice, when it applies (unchanged).
2. Breadcrumbs (they carry the structured data), a centred category pill, the title, the date, reading time and author, and the article's summary as an intro.
3. A wide cover (`Cover` for now; the article's own image from T9.7), 21:9 on a laptop and 16:9 on a phone.
4. Two columns on a laptop: on the left a sticky **In this article** list (the section being read is marked with a thin green line and `aria-current="location"`) and **Share** (copy the link, or email it); on the right the reading column (42rem, 17px text, generous line height). On a phone and tablet the contents list becomes a collapsed "In this article" box above the text and Share sits after the tags.
5. After the text: tags, a **Try it yourself** card for each tool that lists this article, the author card, then **Related articles** in the card grid.

Details:

- The article body keeps its ad placement (`in_article`, after the third block) and its structured data.
- **Contents list.** It appears when an article has at least two headings (at least three for the phone version). The marker uses the browser's IntersectionObserver; with JavaScript off the links still jump to the sections.
- **Share.** No third-party share buttons, because they load other sites' scripts and track visitors. Copy link and Email only.
- **Body styling** (`components/Prose.tsx`): headings use the shared type scale, bullets and links use the green accent, quotes have a thin green rule, callouts a green tint, code blocks ink. Images are rounded and lazy-loaded; captions arrive with T9.7.

## About, Contact, Privacy and Terms (T9.9)

`app/[slug]/page.tsx` picks a layout from `components/pages/PageLayouts.tsx`. All of them are made from the page's own text in the workbook, so editing a page in the admin changes the page; nothing is fixed in the code.

- **About** (`AboutPage`, address `about`): a very large title; the first paragraph as large type and the next ones as a quieter intro; then each `# section` as a row, with its heading on the left (it stays in view while you read) and its text on the right; a bullet list whose every item starts with a **bold lead** becomes a grid of small cards (the bold part is the card's title); and a closing call to action to browse the tools or get in touch. To get the card grid, write the bullets like `- **Private by design.** Your files stay on your device.`
- **Contact** (`ContactPage`, address `contact`): the title band with the first paragraph as the intro, the page's text in a reading column, and a dark card with the contact email (from the `contact_email` setting) and a "Write an email" button. The "Email us at …" line is left out of the text because the card shows the address.
- **Everything else** (`ReadingPage`: Privacy, Terms and any new page): the title band, a "Last updated" line pulled out of the text when the first paragraph starts with those words, a calm reading column, and, for pages with three or more `#` sections, a sticky "On this page" list on the left whose current section is marked as you scroll.
- **Anchors:** every `#` heading on these pages now has an address you can link to (`/privacy-policy/#advertising`).
- **Text style:** headings use the type scale, bullets and links the green accent. Body text is 17px with generous line height, in a column about 44rem wide.
