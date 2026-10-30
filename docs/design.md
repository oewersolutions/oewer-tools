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
