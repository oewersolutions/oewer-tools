# Modern minimal redesign and article images (Phase 9)

Brief from the owner (30 October 2026): a modern, premium, minimalist look; **Poppins** as the font; every article must be able to carry images; use the three reference designs (an articles grid with a huge title, an article page with a contents list beside the text, and a real-estate home page with a dark hero and clean cards).

The reference pages on Dribbble could not be opened from here (they returned empty pages), so this plan is built from the three screenshots supplied. If the Dribbble shots show something the screenshots do not, send screenshots of them.

## What the references teach

| Reference | What we take from it |
|---|---|
| **Articles grid** (Miller.S) | A very large, confident page title; lots of white space; a thin rule with small quiet labels; image-led cards in a clean three-column grid; each card has one line of small meta (date, minutes to read), a two-line title and a short grey summary; plain black rectangular buttons |
| **Article page** (Snappy) | Back link; a small category pill; a centred, medium-weight title with the date under it; one wide rounded cover image; below it, a quiet contents list on the left (current section marked with a thin line) beside a narrow, comfortable reading column; "Related articles" cards at the end |
| **Home page** (URBN) | A full-width dark image hero with one short headline and a single clean search bar; then simple outlined cards with a number as the hero of the card; a "popular" row of image tiles with arrows |

## Approved preview

A static mockup of the agreed look (home, articles, an article, a tool page, phone views) is in `docs/design-preview/`: open `index.html` in a browser, or see `docs/design-preview/images/`. The owner approved it on 30 October 2026; T9.1 to T9.10 turn it into the real site. Its covers are generated placeholders.

## Design direction

- **Calm and spacious.** Fewer boxes, shadows and gradients than today. Thin lines, generous spacing, one idea per section.
- **Type does the work.** Poppins in a few weights (400, 500, 600, 700), large tight headings, small quiet meta text. Self-hosted at build time like the current fonts, so visitors make no request to Google. Poppins is wide, so body text is set a little smaller with generous line height; the longest line stays near 65 characters.
- **Colour.** Near-white and soft grey surfaces, an ink-black for text and primary buttons, and the existing deep green (`#174f49`) as the single accent for links, focus rings and highlights. The warm gold is retired except for tiny touches. All text pairs keep WCAG AA contrast (checked by the existing accessibility tests).
- **Imagery.** Photos or illustrations lead on articles and the home hero. The site never hot-links other sites' pictures; images are your own or licensed (for example Unsplash's licence) and live in the repository.
- **Motion.** Small, quick, and turned off for visitors who ask for reduced motion.
- **Light only for now.** A dark theme is a possible later extra; it doubles the colour testing, so it is not in this phase.

Two defaults I chose that you can change before T9.1: the **green accent on ink-and-white** (rather than fully black-and-white as in the screenshots) and **no dark mode**.

## Article images (the requirement)

Today an article can only show an inline image if someone first copies a file into `public/assets/` by hand, and there is no cover image. The plan:

1. **Data (T9.7).** Each article gets a **cover image** with required **alt text**, and each image block gets an optional **caption**. This changes the workbook, so the schema moves to 1.0.2 with a migration, and existing workbooks upgrade automatically. A published article must have a cover. The build fails if any referenced image file is missing (already true for inline images).
2. **Upload in the admin (T9.8).** In the article editor: **Add image** lets you pick a file, resizes and compresses it **in your browser** (two sizes, WebP or JPG), and saves it into the repository through the same GitHub connection as the rest of the admin, then fills in the path for you. Alt text is required; a preview is shown. Only JPG, PNG and WebP are accepted (no SVG, which can carry scripts), with a size cap and a sanitised file name. A cover and any number of inline images can be added to the same article.
3. **Display (T9.5 to T9.7).** Cards and article pages use the cover with fixed dimensions (no jumping while loading), lazy loading, and the smaller size on phones. The cover is also used as the social-sharing image.
4. **Seed covers.** The six sample articles get generated, on-brand cover images so the new design looks right from day one. Replace them with real pictures whenever you like.

## Tasks

| Task | What | Notes |
|---|---|---|
| **T9.1** | Design system | Poppins via `next/font`; tokens in `app/globals.css`; type scale, spacing, radius, buttons, cards, focus ring; remove Inter and Fraunces; `docs/design.md`; contrast verified |
| **T9.2** | Header, menu, footer | Slim header with a clear "Tools" and "Blog" and a search; mobile menu; a calmer footer |
| **T9.3** | Home page | Dark image hero with one headline and a search bar; featured tool cards; "popular tools" row; latest articles with images; short trust strip and FAQ; one closing call to action |
| **T9.4** | Tools pages | Big title on the tools index, category pages with simple cards, tool page with the tool first and the guide below in a calm reading layout |
| **T9.5** | Blog listing | The huge "Articles" title, category chips, three-column image cards; same for category, tag and author pages |
| **T9.6** | Article page | Cover image, category pill, centred title and date, contents list beside the text, author card, related tools and articles |
| **T9.7** | Image data | Cover and caption columns, schema 1.0.2, migration, validation, export, seed covers, docs |
| **T9.8** | Admin upload | The image tool inside the article editor, with tests against the pretend GitHub |
| **T9.9** | Static pages | About gets an editorial layout (big statement, values, how it works); Contact, Privacy and Terms get the calm reading layout |
| **T9.10** | QA | Accessibility, contrast, speed budgets (font weights and images kept light), Safari and mobile, SEO audit, update the tests and docs |

## Order and effort

Do T9.1 first: every other task builds on it. Then T9.7 and T9.8 (the data and the upload) before T9.5 and T9.6, so the new article pages can be built and checked with real images. Roughly 9 to 11 working days in all. Each task is committed on its own, so the live site always works and the look changes step by step; part-way through, pages will briefly mix old and new styles, which is the reason for doing the shared system first.

## Risks

- **Photos are the look.** The references depend on strong imagery. Without good pictures the minimal style can feel empty. Plan to add a cover to every article, and I will build the tool tiles and home hero so they look intentional even without photos.
- **Poppins is heavy and wide.** Four weights self-hosted add a little weight to each page; the speed budgets in the tests will catch it, and I will load only the weights used.
- **A schema change (T9.7)** touches the workbook the admin edits. The migration is tested, and the safe-write flow and history already protect the live data.
- **Uploads go into the repository.** Images are public and permanent in Git history, so only upload pictures you have the right to use, and keep them modest in size.
