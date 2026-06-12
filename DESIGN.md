# Pine Lake Covenant Church — Design System

This document describes the visual language, design tokens, components, and layout patterns that make up the PLCC site. It is the authoritative reference for any visual or structural decisions.

---

## Design Philosophy

The visual style is **editorial, earthy, and unhurried** — closer to a thoughtful magazine spread than a corporate web app. It should feel like a real place made of real people, not a polished brand.

Key principles:

- **Warmth without softness.** Earthy tones and organic shapes, but not saccharine.
- **Photos over illustration.** Real moments from community life carry more weight than icons or decoration.
- **Grain and texture.** A subtle SVG grain overlay sits above all content, giving the site a slight print quality.
- **Readable first.** Line lengths are constrained to `65ch`. Typography is warm and slightly literary.

---

## Color Palette

All colors are defined as CSS custom properties on `:root`.

| Token            | Value                    | Usage                                    |
| ---------------- | ------------------------ | ---------------------------------------- |
| `--color-forest` | `rgb(26, 46, 12)`        | Primary text, dark backgrounds, headings |
| `--color-moss`   | `rgb(106, 149, 41)`      | CTAs, hover states, accent green         |
| `--color-stone`  | `rgb(242, 238, 230)`     | Page background, card fills              |
| `--color-clay`   | `rgb(166, 123, 91)`      | Subheads, captions, secondary labels     |
| `--color-mist`   | `rgba(26, 46, 12, 0.08)` | Borders, dividers                        |
| `--color-white`  | `#ffffff`                | Text on dark backgrounds, card surfaces  |

**Color intent:** Forest and stone are the base (dark type on warm off-white). Moss is used sparingly for actionable elements. Clay appears for supporting text — captions, attributions, metadata. Mist is for structural lines that shouldn't compete visually.

---

## Typography

### Typefaces

| Role               | Font                                                                                  | Weights       |
| ------------------ | ------------------------------------------------------------------------------------- | ------------- |
| Headings & display | [Fraunces](https://fonts.google.com/specimen/Fraunces) (serif, variable)              | 700, 800      |
| Body & UI          | [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) (sans, variable) | 400, 500, 700 |

Both are loaded via Google Fonts (`preconnect` headers in `BaseLayout.astro`).

### Fraunces Variation Settings

Headings use optical size and softness axes:

```css
font-variation-settings:
  'SOFT' 100,
  'WONK' 1;
```

This gives headings a hand-drawn, slightly organic quality that reinforces the earthy tone.

### Heading Scale

Headings use `font-family: var(--font-serif)`, `font-weight: 700`, `line-height: 1.1`, and `text-wrap: balance`.

Page `h1` elements use a fluid scale:

```css
font-size: clamp(2.5rem, 8vw, 4.5rem);
letter-spacing: -0.02em;
```

### Body Text

- Base body: `font-family: var(--font-sans); line-height: 1.6`
- Large lede/intro text: `.text-body-large { font-size: 1.25rem; line-height: 1.7 }`
- Pull-quote / subhead: `font-family: var(--font-serif); font-style: italic; color: var(--color-clay)`

---

## Spacing

| Token        | Value    | Typical Use                             |
| ------------ | -------- | --------------------------------------- |
| `--space-xs` | `0.5rem` | Tight gaps                              |
| `--space-s`  | `1.5rem` | Between related items                   |
| `--space-m`  | `3rem`   | Between sections, page margins          |
| `--space-l`  | `6rem`   | Bottom of page, generous breathing room |
| `--measure`  | `65ch`   | Maximum readable line length            |

---

## Tactile / Surface Tokens

These define the physical feel of surfaces and elevation.

| Token                     | Value                                                                             | Usage                                               |
| ------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| `--radius-soft`           | `16px`                                                                            | Cards, panels, images                               |
| `--radius-organic`        | `32px 16px 32px 16px`                                                             | Featured/hero elements with irregular rounding      |
| `--shadow-diffuse`        | `0 15px 45px -15px rgba(26,46,12,0.15)`                                           | Subtle lift for cards and tiles                     |
| `--shadow-panel`          | `0 12px 32px -20px rgba(26,46,12,0.35)`                                           | Stronger shadow for section panels                  |
| `--surface-gradient-soft` | `linear-gradient(170deg, rgba(255,255,255,0.94) 0%, rgba(242,238,230,0.72) 100%)` | Card/panel background — warm white fading to stone  |
| `--grain`                 | SVG fractal noise                                                                 | Global texture overlay (applied via `body::before`) |

The grain overlay (`opacity: 0.8`) is fixed-position and pointer-events-none — it doesn't interrupt interaction but adds a slightly printed, tactile quality to the whole page.

---

## Utility Classes

Global single-purpose classes in `global.css`:

| Class                    | Effect                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| `.surface-gradient-soft` | Applies `--surface-gradient-soft` as background                    |
| `.text-body-large`       | `font-size: 1.25rem; line-height: 1.7`                             |
| `.logo-circle`           | `border-radius: 50%; object-fit: cover` — for circular image crops |
| `.page--wide`            | Removes `max-width` from `.page` for full-width layouts            |

---

## Layout Patterns

### Narrow Reading Page (default)

```html
<article class="page">
  <header class="page__header">...</header>
  <section class="section">...</section>
</article>
```

The `.page` class sets `max-width: var(--measure)` — all content flows at a comfortable reading width.

### Wide Page with Prose Constraint

For pages that mix full-bleed photos with readable text (e.g., Plan a Visit, Families, I'm New):

```html
<article class="page page--wide">
  <header class="page__header [page]__prose">...</header>
  <section class="section [page]__prose [page]__panel surface-gradient-soft">...</section>
</article>
```

A scoped `.[page]__prose` class constrains text sections to `max-width: var(--measure)`, while photo sections (like `MomentsSection`) can run full-width outside the article.

### Section Panel Pattern

The primary content pattern on section pages. Every `<section>` becomes a visual card:

```html
<section class="section [page]__prose [page]__panel surface-gradient-soft">
  <h2>Section title</h2>
  ...
</section>
```

With scoped CSS:

```css
.[page]__panel {
  padding: clamp(1.25rem, 2.4vw, 2rem);
  border-radius: var(--radius-soft);
  border: 1px solid var(--color-mist);
  box-shadow: var(--shadow-panel);
}

.[page]__panel h2 {
  margin-top: 0;
}
```

This pattern is used on: **Plan a Visit**, **Families**, and should be applied to future section pages.

---

## Site Header

The header uses a flex nav row with three visual zones:

1. **Home link** — circular logo (`3.3rem`, `border-radius: 50%`) + church name in Fraunces 800
2. **Nav links** — Instrument Sans 500, with moss-color hover and mist underline
3. **CTA pill** — "Plan a Visit" in moss background, `border-radius: 999px`, rightmost

```html
<a href="..." class="site-nav__home" aria-label="Pine Lake Covenant Church — Home">
  <img src="..." alt="" class="logo-circle" width="53" height="53" />
  <span class="site-nav__home-name">Pine Lake Covenant Church</span>
</a>
```

The church name wraps at `max-width: 10rem`, producing a natural two-line break.

---

## Components

### `MomentsSection`

**File:** `src/components/MomentsSection.astro`

A reusable 3-column portrait photo grid. Used on all main section pages to inject a moment of life between content.

```typescript
type Props = {
  heading?: string | null // null suppresses the heading; default = 'Moments from Pine Lake'
  items: MomentsItem[] // { image?: HomePageImage, fallbackAlt: string }
  sectionClass?: string // wrapping section class; default = 'section'
}
```

Grid layout:

- Desktop: 3 columns, `aspect-ratio: 4/5` (portrait)
- Mobile (≤768px): 2 columns

Usage pattern:

```astro
---
import MomentsSection from '../components/MomentsSection.astro'
import { imageByFilename } from '../data/homePageImages'

const items = [
  { image: imageByFilename('filename.jpg'), fallbackAlt: 'Descriptive alt text' },
  { image: imageByFilename('another.jpg'), fallbackAlt: 'Another moment' },
]
---

<MomentsSection items={items} sectionClass="section" />
```

### `DoorCard`

**File:** `src/components/DoorCard.astro`

A clickable card used on the "For Our Neighbors" page. Cards display in a 2-column responsive grid (`.doors`) — 2-wide on desktop, 1-wide on mobile.

### `QuoteGrid`

**File:** `src/components/QuoteGrid.astro`

Renders `.story-quote` cards, used on the home page. Cards use `--surface-gradient-soft` background with `--shadow-panel` elevation — visually consistent with section panels.

### `LinkCardSection`

**File:** `src/components/LinkCardSection.astro`

Renders `.link-card` tiles — white background, `--shadow-diffuse`, moss border on hover. Used for navigational grid sections.

---

## Image System

All church photos live in `src/assets/images/` and are catalogued (tags + alt) in `src/data/homePageImages.ts`. Photos render through the `<Photo>` component — a wrapper around Astro's `<Image>` — which resolves a filename to an optimized, responsive WebP via the `src/lib/images.ts` registry (`import.meta.glob`). Brand assets (logos, icons) live alongside the photos in `src/assets/images/`.

Filenames remain the data-level identifier (in `homePageImages.ts` and `<Photo filename="…" />`), so the catalogue could later be swapped for a CMS response with minimal change.

Each catalogue entry:

```typescript
type HomePageImage = { filename: string; tags: string[]; alt?: string }
```

Tags in use: `worship`, `kids`, `family`, `community`, `service`, `social`, `gathering`, `care`, `generosity`, `youth`, `prayer`, `teaching`, `baptism`, `communion`, `church`, `building`, `exterior`, `pastor`, `leadership`, `portrait`

Helper functions:

- `imagePublicSrc(filename)` — returns the correct public URL including `BASE_URL`
- `imageAlt(image, fallback)` — returns `image.alt` if set, otherwise `fallback`
- `imageByFilename(filename)` — finds an image entry by filename

Use a plain `<img>` tag with `imagePublicSrc(filename)` for all photos. Do not use Astro's `<Image />` component or `import` local image files; doing so ties the image to the build pipeline and makes a future CMS migration harder.

---

## Page Header Pattern

Standard page entry point, used on all section pages:

```html
<header class="page__header">
  <h1>Page Title</h1>
  <p class="page__subhead">Italic clay-colored subtitle in Fraunces</p>
  <p class="page__lede">Intro paragraph — can contain a CTA link styled as a pill button</p>
</header>
```

- `.page__header h1`: fluid `clamp(2.5rem, 8vw, 4.5rem)`, `letter-spacing: -0.02em`
- `.page__subhead`: Fraunces italic, clay color, `font-size: 1.25rem`
- `.page__lede`: any `<a>` inside renders as a full pill CTA button (moss background, `border-radius: 999px`)
