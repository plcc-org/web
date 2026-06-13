# Pine Lake Covenant Church — Web Style Guide

The authoritative reference for the site's visual language, design tokens, layout
system, and components.

> **Source of truth.** This document describes the CSS in `src/styles/` and the
> components in `src/components/`. When the two disagree, the code wins — update
> this file to match.

---

## 1. Visual language

The style is **editorial, earthy, and photo-forward** — closer to a thoughtful
magazine than a corporate web app.

- **Warm, not soft.** Earthy greens and warm neutrals; generous type; restrained
  ornament.
- **Photos carry the page.** Real, candid moments — embedded into the layout as
  full-bleed splits and galleries, not boxed into little cards.
- **Portrait-first.** The photo library is ~90% portrait (4:5 / taller). Layouts
  are built around vertical images; **avoid wide landscape crops** except for the
  one hero video and incidental building shots.
- **A continuous surface.** Alternating bands (paper → sand → forest) and a subtle
  grain overlay give the page a tactile, printed quality.
- **Readable.** Body copy is capped near `65ch`; headings are Fraunces with an
  organic optical-size axis.

---

## 2. Stylesheet organization

`src/styles/global.css` is the entry point. **Import order is the cascade order**
(later files win on equal-specificity ties):

```
tokens → base → nav → layout → components → footer → utilities → pages
```

| File             | Responsibility                                                                  |
| ---------------- | ------------------------------------------------------------------------------- |
| `tokens.css`     | All custom properties (`:root`). No selectors but `:root`.                      |
| `base.css`       | Resets, document defaults, heading scale, grain overlay, app-shell spacing.     |
| `nav.css`        | Header / primary navigation (incl. mobile hamburger).                           |
| `layout.css`     | The two layout systems, bands, rhythm + typographic utilities, buttons, panels. |
| `components.css` | Hero, Split, cards, media, chips, events, quotes, prose-link defaults.          |
| `footer.css`     | Full-bleed site footer.                                                         |
| `utilities.css`  | Chips/tags, the youth gallery.                                                  |
| `pages.css`      | Page-specific styling that isn't reusable (Ethos, Leadership).                  |

Component-local styling lives in each `.astro` file's scoped `<style>` block.

---

## 3. Design tokens

All tokens are CSS custom properties on `:root` (`tokens.css`). **Always reference
tokens — never hard-code a hex, size, or shadow in a component.**

### Color

| Token                  | Value                   | Use                                      |
| ---------------------- | ----------------------- | ---------------------------------------- |
| `--color-forest`       | `rgb(26, 46, 12)`       | Primary ink, dark panels, headings       |
| `--color-forest-2`     | `rgb(45, 77, 24)`       | Mid-forest stop in gradients             |
| `--color-moss`         | `rgb(106, 149, 41)`     | Primary action / accent                  |
| `--color-moss-2`       | `rgb(115, 148, 59)`     | Brighter moss — eyebrows, keylines, logo |
| `--color-clay`         | `rgb(166, 123, 91)`     | Captions, metadata, italic subheads      |
| `--color-ember`        | `rgb(189, 101, 56)`     | Warm secondary accent — use sparingly    |
| `--color-stone`        | `rgb(242, 238, 230)`    | Page background                          |
| `--color-sand`         | `rgb(233, 226, 213)`    | Deeper warm band / callout fill          |
| `--color-paper`        | `rgb(250, 248, 244)`    | Lightest surface — cards, light splits   |
| `--color-white`        | `#ffffff`               | Surfaces & text on dark                  |
| `--color-ink`          | `= forest`              | Default text color                       |
| `--color-ink-soft`     | `rgba(26,46,12,0.72)`   | Secondary body text (e.g. `.lede`)       |
| `--color-mist`         | `rgba(26,46,12,0.08)`   | Hairline borders, dividers               |
| `--color-line`         | `rgba(26,46,12,0.14)`   | Slightly stronger border                 |
| `--color-on-dark`      | `rgba(255,255,255,.94)` | Body text on forest surfaces             |
| `--color-on-dark-soft` | `rgba(255,255,255,.72)` | Muted text on forest surfaces            |

**Intent:** forest + stone are the base (dark type on warm off-white). Moss is for
anything actionable. Clay is supporting text. Sand/paper are surface tints for
banding. Ember is a rarely-used warm pop.

### Typography scale

Two families, one fluid modular scale. Don't invent ad-hoc `clamp()` sizes.

| Token            | Value (≈)                                     |
| ---------------- | --------------------------------------------- |
| `--text-xs`      | `0.78rem`                                     |
| `--text-sm`      | `0.875rem`                                    |
| `--text-base`    | `1rem`                                        |
| `--text-md`      | `clamp(1.05rem, …, 1.2rem)` — body default    |
| `--text-lg`      | `clamp(1.2rem, …, 1.45rem)` — lede            |
| `--text-xl`      | `clamp(1.45rem, …, 1.95rem)` — h3             |
| `--text-2xl`     | `clamp(1.85rem, …, 2.6rem)` — h2              |
| `--text-3xl`     | `clamp(2.3rem, …, 3.4rem)` — h1               |
| `--text-display` | `clamp(2.6rem, …, 4.75rem)` — hero/`.display` |

Line-heights: `--leading-tight 1.12`, `--leading-snug 1.3`, `--leading-normal 1.6`,
`--leading-relaxed 1.72`. Tracking: `--tracking-tight -0.02em`, `--tracking-wide 0.06em`.

### Spacing

`--space-section` (`clamp(3.25rem, 6vw, 6rem)`) is the rhythm between major page
sections; `--gutter` (`clamp(1.25rem, 4vw, 2.5rem)`) is the page edge inset.

Ramp: `--space-3xs .25` · `--space-2xs .5` · `--space-sm .75` · `--space-md 1.25` ·
`--space-lg 2` · `--space-xl 3` · `--space-2xl 4.5` · `--space-3xl 6` (rem).

> Legacy aliases `--space-xs .5`, `--space-s 1.5`, `--space-m 3`, `--space-l 6`
> are kept at their original values for the legacy `.page` flow. Prefer the named
> ramp above in new work.

### Layout widths

| Token             | Value    | Use                                  |
| ----------------- | -------- | ------------------------------------ |
| `--measure`       | `65ch`   | Max readable line length             |
| `--width-text`    | `38rem`  | Narrow reading column                |
| `--width-content` | `70rem`  | Default content container (canvas)   |
| `--width-wide`    | `78rem`  | Galleries / wide blocks (`.to-wide`) |
| `--width-shell`   | `1120px` | Header / footer / main shell         |

### Radii, shadows, surfaces

- Radii: `--radius-sm 10px`, `--radius-soft 16px`, `--radius-lg 24px` (cards/panels),
  `--radius-organic` (asymmetric), `--radius-pill 999px`.
- Shadows: `--shadow-sm` (cards at rest), `--shadow-md` (hover / panels),
  `--shadow-lg` (heroes/lifts). `--shadow-diffuse` aliases `--shadow-md`;
  `--shadow-panel` is legacy.
- Surfaces: `--surface-gradient-soft` (warm-white→stone), `--gradient-forest`
  (shared dark-panel gradient for hero / `band--forest` / `split--forest`).
- `--grain` — SVG fractal noise applied via `body::before` at `opacity: 0.5`,
  `mix-blend-mode: multiply`, `position: fixed`, `z-index: 9999`,
  `pointer-events: none`.
- Easing: `--ease-out` (most transitions), `--ease-spring` (playful lifts).

---

## 4. Typography utilities

Decoupled from any wrapper — usable anywhere (`layout.css`).

| Class                         | Effect                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| `.eyebrow`                    | Small uppercase moss-2 label; the standard kicker above a heading. |
| `.display`                    | `--text-display`, tight tracking — big page/section titles.        |
| `.subhead`                    | Fraunces italic, clay — secondary line under a title.              |
| `.lede` / `.text-body-large`  | `--text-lg` intro paragraph (`.lede` also dims to ink-soft).       |
| `.measure` / `.prose-measure` | Cap width at `65ch`.                                               |
| `.measure-wide`               | Cap width at `52rem`.                                              |

Headings (`h1`–`h4`) are Fraunces 700 with `font-variation-settings: var(--serif-display)`
(`'SOFT' 100, 'WONK' 1`), `text-wrap: balance`, and the scale sizes above. Body is
Instrument Sans at `--text-md`/`--leading-normal`. `<p>` uses `text-wrap: pretty`.

A typical header:

```html
<p class="eyebrow">For Our Neighbors</p>
<h1 class="display">Serve</h1>
<p class="subhead">Ways to help — nearby and on Sundays</p>
<p class="lede">If you’re looking for a way to help…</p>
```

---

## 5. Layout system

### App shell

`base.css` centers `.site-header`, `.site-main`, `.site-footer` at `--width-shell`
with `--space-s` padding. `html` has `overflow-x: clip` so full-bleed (`100vw`)
sections never produce a horizontal scrollbar — **`clip`, not `hidden`, so
`position: sticky` still works** (e.g. the Pastor's Letter sidebar).

There are **two layout systems**. New pages use the canvas.

### A. `.canvas` — full-bleed content grid (preferred)

A single CSS grid that breaks out of the shell to span the viewport, then lays its
children in a centered column. This is the backbone of every photo-forward page.

```html
<div class="canvas">
  <Split class="to-full" … />
  <!-- bleeds edge to edge -->
  <section class="section">…</section>
  <!-- sits in the content column -->
  <MomentsSection sectionClass="to-wide" … />
  <!-- wider gallery track -->
</div>
```

- Children default to the **content column** (`--width-content`, gutter on both
  sides).
- `.to-full` → spans the **full viewport width** (heroes, bands, splits).
- `.to-wide` → centered, capped at `--width-wide` (galleries).
- Vertical rhythm comes from the grid's `row-gap: var(--space-section)` — **not**
  sibling margins, so any component works as a direct child regardless of order.
- `.pull-up` tightens the gap above a child when two blocks should read as a pair.

### B. Legacy `.page` flow

The original reading wrapper, kept for dense text pages. `.page` caps at `--measure`
(narrow); `.page--wide` removes the cap; vertical rhythm comes from
`.page > * + * { margin-top: var(--space-m) }`. Header classes `.page__header h1`,
`.page__subhead`, `.page__quote` belong to this flow.

> **When to use which:** photo-led / landing / section pages → `.canvas`. Dense
> reading pages (beliefs, covenant, policy-like detail) → `.page`. The Pastor's
> Letter keeps a bespoke `.page--wide` layout intentionally.

### Bands

Full-bleed colored sections with re-contained inner content. Use as a `.to-full`
canvas child (or standalone).

```html
<section class="band band--forest to-full">
  <div class="band__inner">…</div>
  <!-- centered at --width-content -->
</section>
```

Tones: `band--forest` (dark gradient, light text — headings forced white),
`band--sand`, `band--paper`.

### Rhythm utilities

`.flow > * + *` (= `--space-section`), `.flow-tight > * + *` (`--space-lg`),
`.stack > * + *` (`--space-md`) — for vertical spacing outside the canvas grid.

### `.page-intro`

A calm, photo-less header for reading pages: adds top breathing room and caps its
children at `--measure`.

```html
<header class="section page-intro">
  <p class="eyebrow">About</p>
  <h1 class="display">What We Believe</h1>
  <p class="lede">…</p>
</header>
```

---

## 6. Components

Props below reflect each component's actual `Props` type.

### `Hero` — full-bleed cinematic header

`src/components/Hero.astro`. Background **video** (with poster fallback) or portrait
**image**, under a forest gradient scrim, with content anchored bottom-left. CSS
`.hero*` in `components.css`.

```astro
<Hero
  video={`${base}video/homepage-hero.mp4`}
  poster={heroPoster.src}
  eyebrow="Pine Lake Covenant Church · Sammamish"
  title="Discovering life with Jesus together"
  subhead="Sundays at 10:00am."
>
  <a class="btn" href={`${base}plan-a-visit/`}>Plan a Visit</a>
</Hero>
```

Props: `video?`, `poster?`, `filename?`, `alt?`, `eyebrow?`, `title`, `subhead?` +
default slot (CTA). The video is hidden under `prefers-reduced-motion`; the poster
shows through.

### `Split` — asymmetric portrait photo + text (the workhorse)

`src/components/Split.astro`. A tall portrait photo filling one half (bleeding to
the viewport edge when used as `.to-full`), text aligned to the content column.

```astro
<Split
  class="to-full"
  filename="…n.jpg"
  alt="…"
  tone="sand"
  reverse
  eyebrow="Families"
  heading="Families on Sunday mornings"
  id="kids"
>
  <p>…body…</p>
</Split>
```

Props: `filename`, `alt`, `reverse?` (photo on the right), `tone?` =
`'paper' | 'sand' | 'forest'`, `eyebrow?`, `heading?` (rendered as `h2`), `class?`
(pass `to-full`), `imgClass?`, `id?`. For a photo-led page **hero**, omit `heading`
and put an `<h1 class="display">` in the slot. Stacks to a single column ≤ 860px.

### `MomentsSection` — portrait gallery

`src/components/MomentsSection.astro`. A 3-up (2-up on mobile) grid of 4:5 portrait
tiles with a gentle editorial stagger and hover zoom.

```astro
<MomentsSection eyebrow="Life together" heading="Moments from Pine Lake" items={items} sectionClass="to-wide" />
```

Props: `heading?` (`null` to hide), `eyebrow?`, `items: { image?, fallbackAlt }[]`
(entries without an `image` are skipped), `sectionClass?` (default `'section'`; pass
`'to-wide'` in a canvas). Image styles are `:global()` because the `<img>` is
rendered by the child `<Photo>` (see §9).

### Other components

- **`LinkCardSection`** — `{ heading?='Start here', links }` → `.link-grid` of
  `.link-card` tiles (title + meta).
- **`QuoteGrid`** — `{ quotes }`; a client-side rotating carousel of `.story-quote`
  cards (used on Home).
- **`DoorCard`** — `{ title, intro, body, bullets, ctaLabel, href }`; the
  needs-based cards on For Our Neighbors (`.doors` grid).
- **`EventsBoard`** — `{ events, selected }`; What's Happening (chips, featured
  grid, weekly list, rhythms). Renders its own `.canvas`.
- **`Photo`** — see §8.

### Cards

- `.card` + `.card-grid` — paper surface, `--radius-lg`, `--shadow-sm`, hairline
  border. `card-grid` is `repeat(auto-fit, minmax(240px, 1fr))`. **Link cards
  (`a.card`) lift on hover; static `div.card` do not.**
- `.link-card` + `.link-grid` — same surface treatment, used for navigational tiles
  (always links, always lift).

### Callouts & panels

- `.section-callout` — a **sand** panel with a 4px moss left accent for emphasis /
  reassurance asides (e.g. "Safety and care"). Children cap at `--measure`.
- `.content-panel` — neutral bordered panel (`--radius-lg`, `--shadow-md`); add
  `.surface-gradient-soft` for the warm-white fill.

### Buttons

- `.btn` — moss pill, white text, `--shadow-md`, hover → forest + lift.
- `.btn--ghost` — transparent with a line border; hover fills forest.
- **On dark surfaces** (`.hero`, `.band--forest`, `.split--forest`) the primary
  `.btn` flips to a **white fill with forest text** so it doesn't read
  green-on-green; ghost buttons invert to a white outline. This is automatic — just
  use `.btn` / `.btn--ghost`.

### Chips, media, ratios

- `.chip` / `.chip--active`, `.tag` (`utilities.css`) — pills and labels.
- `.media` / `.media__frame` / `.media__img` (`--cover`) / `.media__caption` —
  framed photo/figure primitives. Ratio helpers: `.ratio-16x9`, `.ratio-4x5`,
  `.ratio-4x3`, `.ratio-1x1`.
- `.embed` — 16:9 responsive iframe wrapper.

### Page-specific (in `pages.css`)

- **Leadership** — `.leader-grid` / `.leader-card` (portrait headshots, name, title).
- **Ethos** — `.ethos__pillars` (numbered 3-step timeline) and `.belief-grid` of
  `.belief-statement` cards (paper, moss left accent; `.belief-lead` italic,
  `.belief-key` moss-2).

> **Legacy / sparingly-used:** `.tile`, `.tile-grid`, `.vignette*`, `.story-grid`'s
> wide min-track, and the older `.event-card`/`.event-date` styles predate the
> current card system. Prefer `Split`, `MomentsSection`, `.card`, and `.link-card`
> for new work.

---

## 7. Header & footer

- **Header** (`nav.css`) — wordmark (a green image mask) + nav links + a moss
  "Plan a Visit" CTA pill. Collapses to a hamburger ≤ 1080px (toggle script in
  `BaseLayout.astro`).
- **Footer** (`footer.css`) — full-bleed forest panel (`margin-inline: calc(50% - 50vw)`)
  with church info, footer nav, and social links on a faint grid texture. On the
  Home page the closing `band--forest` CTA flows flush into it (the page zeroes the
  shell's bottom padding and the footer's top margin so the dark base is continuous).

---

## 8. Photography & the image system

Photos are the primary visual material. **Favor portrait (4:5 or taller); avoid
landscape crops.**

- Files live in `src/assets/images/` and are catalogued in
  `src/data/homePageImages.ts` as `{ filename, tags[], alt? }`.
- Render through **`<Photo>`** (`src/components/Photo.astro`), a wrapper over Astro's
  `<Image>` that resolves a filename via `src/lib/images.ts` and emits an optimized,
  responsive WebP with intrinsic dimensions (no layout shift). Props: `filename`,
  `alt`, `class?`, `widths?` (default `[480, 960, 1440]`), `sizes?`, `loading?`
  (default `'lazy'`), `fetchpriority?`, `format?` (default `'webp'`). Renders nothing
  if the file is missing.
- Helpers: `imageByFilename(name)`, `imageAlt(image, fallback)`,
  `getImagesByAnyTag(tags)`, `pickImageByAnyTag(tags, exclude?)`.
- Keep the filename as the data-level identifier so the catalogue could later be a
  CMS response. Write descriptive `alt` text in the catalogue.
- Photos are **not mapped 1:1** to stories — reuse across pages is fine; avoid
  repeating the same image twice on one page.

---

## 9. Conventions & gotchas

- **Internal links** use the base path: ``href={`${import.meta.env.BASE_URL}about/`}``.
- **Scoped styles don't reach child components.** A scoped rule in a parent `.astro`
  will not style markup rendered by a child component (e.g. the `<img>` inside
  `<Photo>`). Use `:global(.class)` for those, as `MomentsSection` and the logo
  styles do.
- **Prose-link `:where()` rule.** In-content links default to moss via
  `:where(.site-main a:not(.link-card):not(.card))`. The `:visited` and `:hover`
  variants are written **inside** the `:where()` so the pseudo-class stays at zero
  specificity — otherwise `:visited` would tie `.btn` (0,1,0) and, being later in the
  cascade, repaint visited buttons moss-on-moss. Keep any new link-state rule inside
  the `:where()`.
- **Full-bleed math.** `width: 100vw; margin-inline: calc(50% - 50vw)` breaks an
  element out of the shell; `html { overflow-x: clip }` absorbs the scrollbar delta.
- **Data-driven content.** Repeating content (nav links, doors, quotes, start-here
  links) lives in `src/data/` and is mapped over — don't hand-author lists in pages.
- **Reference tokens, not literals.** New CSS should use `var(--…)` for color, size,
  spacing, radius, and shadow.

---

## 10. Building a page (recipe)

A photo-led section page:

```astro
<BaseLayout title="…">
  <div class="canvas">
    <!-- Opener: portrait photo + title -->
    <Split class="to-full" filename="…" alt="…" tone="sand" reverse eyebrow="…">
      <h1 class="display">Page Title</h1>
      <p class="lede">…</p>
    </Split>

    <!-- Content sections in the centered column -->
    <section class="section">
      <p class="eyebrow">…</p>
      <h2>…</h2>
      <p class="measure">…</p>
      <div class="card-grid">…</div>
    </section>

    <!-- A reassurance aside -->
    <section class="section section-callout">…</section>

    <!-- A second photo beat -->
    <Split class="to-full" filename="…" alt="…" tone="paper" heading="…">…</Split>

    <!-- A gallery -->
    <MomentsSection eyebrow="Life together" items={items} sectionClass="to-wide" />

    <!-- Optional closing CTA -->
    <section class="band band--forest to-full">
      <div class="band__inner">… <a class="btn" href="…">Plan a Visit</a></div>
    </section>
  </div>
</BaseLayout>
```

A reading page: `<article class="page">` (narrow) with a `.page__header` (or a
`.canvas` + `.page-intro`), then `.section` blocks of prose.
