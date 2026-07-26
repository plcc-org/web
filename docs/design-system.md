# Pine Lake Covenant Church — Web Style Guide

The authoritative reference for the site's visual language, design tokens, layout
system, motion, and components.

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
- **Portrait-first.** The photo library is overwhelmingly portrait (4:5 or taller).
  Layouts are built around vertical images; **avoid wide landscape crops.**
- **A continuous surface.** Alternating bands (paper → stone → sand → forest) and a
  subtle grain overlay give the page a tactile, printed quality.
- **Readable.** Body copy is capped at one of three measures; headings are Fraunces
  with an optical-size axis tied to rendered size.

---

## 2. Stylesheet organization

`src/styles/global.css` is the entry point. **Import order is the cascade order**
(later files win on equal-specificity ties):

```
tokens → base → nav → layout → components → footer → utilities → animations → pages
```

| File             | Responsibility                                                                   |
| ---------------- | -------------------------------------------------------------------------------- |
| `tokens.css`     | All custom properties (`:root`). No selectors but `:root`.                       |
| `base.css`       | Resets, document defaults, heading scale, grain overlay, skip link.              |
| `nav.css`        | Header / primary navigation (incl. mobile hamburger and the hero overlay state). |
| `layout.css`     | The canvas grid, bands, typographic utilities, buttons.                          |
| `components.css` | Hero, Split, cards, media, events, quotes, prose-link defaults.                  |
| `footer.css`     | Full-bleed site footer.                                                          |
| `utilities.css`  | Pills, tags, and utility chips.                                                  |
| `animations.css` | Opt-in scroll reveals and the hero entrance (§6).                                |
| `pages.css`      | Page-specific styling that isn't reusable (Leadership).                          |

Component-local styling lives in each `.astro` file's scoped `<style>` block.

> The cascade depending on `@import` sequence is a real fragility — reordering these
> lines silently changes which rules win. `@layer` would make the order explicit and
> is worth adopting; it hasn't been yet. Until then, treat the order above as load-bearing.

---

## 3. Design tokens

All tokens are CSS custom properties on `:root` (`tokens.css`). **Always reference
tokens — never hard-code a hex, size, or radius in a component.** This is enforced by
Stylelint (`npm run lint:css`), not merely encouraged.

### Colour

| Token                  | Value                   | Use                                              |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| `--color-forest`       | `rgb(26, 46, 12)`       | Primary ink, dark panels, headings               |
| `--color-forest-2`     | `rgb(45, 77, 24)`       | Mid-forest stop in gradients                     |
| `--color-forest-deep`  | `#102507`               | Footer gradient end                              |
| `--color-moss`         | `rgb(106, 149, 41)`     | Brand green — **decoration only** (see below)    |
| `--color-moss-2`       | `rgb(115, 148, 59)`     | Brighter moss — the wordmark, keylines           |
| `--color-moss-ink`     | `rgb(74, 104, 29)`      | Moss **as text**, and as a fill under white text |
| `--color-moss-light`   | `#cde6b2`               | Moss legible on a dark panel (footer links)      |
| `--color-clay`         | `rgb(166, 123, 91)`     | Warm secondary — rules, marks, fills             |
| `--color-clay-ink`     | `rgb(120, 89, 66)`      | Clay **as text**: captions, metadata, subheads   |
| `--color-ember`        | `rgb(189, 101, 56)`     | Warm secondary accent — used sparingly           |
| `--color-stone`        | `rgb(242, 238, 230)`    | Page background                                  |
| `--color-sand`         | `rgb(228, 219, 202)`    | Deeper warm band, alternating sections           |
| `--color-paper`        | `rgb(250, 248, 244)`    | Lightest surface — cards, light splits           |
| `--color-ink`          | `= forest`              | Default text colour                              |
| `--color-ink-soft`     | `rgba(26,46,12,0.72)`   | Secondary body text (e.g. `.lede`)               |
| `--color-mist`         | `rgba(26,46,12,0.08)`   | Hairline borders, dividers                       |
| `--color-line`         | `rgba(26,46,12,0.14)`   | Slightly stronger border                         |
| `--color-moss-line`    | `rgba(106,149,41,0.4)`  | The border a card takes on hover                 |
| `--color-on-dark`      | `rgba(255,255,255,.94)` | Body text on forest surfaces                     |
| `--color-on-dark-soft` | `rgba(255,255,255,.72)` | Muted text on forest surfaces                    |
| `--color-on-dark-line` | `rgba(255,255,255,.5)`  | Dividers and underlines on dark                  |

**Intent:** forest + stone are the base (dark type on warm off-white). Moss carries
action. Clay is supporting text. Sand/paper are surface tints for banding. Ember is a
rarely-used warm pop.

#### The two-strength accents

`--color-moss` and `--color-clay` are **brand colours, not text colours**. At full
strength moss reaches 2.6:1 on sand and clay 2.7:1, against the 4.5:1 WCAG AA asks of
body text. Each therefore comes in two strengths, and **which one you reach for is
decided by whether type is involved**, not by how it looks:

| Use                                                       | Token                                   |
| --------------------------------------------------------- | --------------------------------------- |
| Keylines, rules, dots, borders, the wordmark              | `--color-moss` / `--color-clay`         |
| The accent as text on a light surface                     | `--color-moss-ink` / `--color-clay-ink` |
| A fill sitting under white text (`.btn`, `.chip--active`) | `--color-*-ink`                         |

The last row is the one that surprises people: a moss button is the same contrast pair
upside down, so it takes the ink too. Both inks are the full-strength hue scaled toward
black, so the hue is unchanged and the two strengths read as one family.

Two guards keep this from drifting: Stylelint refuses the full-strength accents as a
`color` value, and `test/contrast.test.ts` computes the ratios from `tokens.css` — so
changing a _surface_ (deepening sand, say) fails the build rather than quietly eating
every accent's margin.

**The binding surface is `sand`**, not paper — it's the darkest opaque band and the
default tone for `Band`, `Split`, `QuoteCarousel` and `PageHero`.

### Typography scale

Two families, one fluid modular scale. Don't invent ad-hoc `clamp()` sizes.

| Token            | Value                                           |
| ---------------- | ----------------------------------------------- |
| `--text-2xs`     | `0.75rem` — micro-labels: tags, chips, legal    |
| `--text-xs`      | `0.8rem` — small captions, cadence labels       |
| `--text-sm`      | `0.875rem` — eyebrows, small buttons            |
| `--text-ui`      | `0.95rem` — nav, footer, card meta              |
| `--text-base`    | `1rem`                                          |
| `--text-md`      | `clamp(1.05rem, …, 1.2rem)` — body default      |
| `--text-lg`      | `clamp(1.2rem, …, 1.45rem)` — lede              |
| `--text-xl`      | `clamp(1.45rem, …, 1.95rem)` — h3               |
| `--text-2xl`     | `clamp(1.85rem, …, 2.6rem)` — h2                |
| `--text-3xl`     | `clamp(2.3rem, …, 3.4rem)` — h1                 |
| `--text-display` | `clamp(2.6rem, …, 4.75rem)` — hero / `.display` |

The small end is **fixed on purpose**: interface chrome shouldn't grow with the viewport
the way headlines do. `--text-ui` sits between `sm` and `base` and is not part of the
content ramp.

Line-heights: `--leading-tight 1.12`, `--leading-normal 1.6`, `--leading-relaxed 1.72`.
Tracking: `--tracking-tight -0.02em`, `--tracking-wide 0.06em`.

#### The `--serif-*` optical-size system

The most distinctive decision in the system, and the easiest to undo by accident.

Fraunces is variable on **optical size** (`opsz` 9–144), **SOFT** (terminal rounding,
0–100) and **WONK** (its quirky alternates, 0/1). Rather than one setting everywhere,
`opsz` is **tied to the rendered size** — large type gets the high-contrast display cut,
small headings stay calm — the way a metal type family was drawn fresh at each size.

| Token             | Setting                          | Applied to        |
| ----------------- | -------------------------------- | ----------------- |
| `--serif-display` | `'opsz' 84, 'SOFT' 30, 'WONK' 1` | Hero / `.display` |
| `--serif-h1`      | `'opsz' 72, 'SOFT' 30, 'WONK' 1` | `h1`              |
| `--serif-h2`      | `'opsz' 72, 'SOFT' 30, 'WONK' 0` | `h2`              |
| `--serif-h3`      | `'opsz' 48, 'SOFT' 30, 'WONK' 0` | `h3`              |
| `--serif-h4`      | `'opsz' 36, 'SOFT' 30, 'WONK' 0` | `h4`              |

**WONK is spent only on the largest display type**, so the personality lands once,
loudly, rather than on every heading. SOFT stays at 30 throughout — 100 reads noticeably
heavier. If a new heading style needs Fraunces, use one of these tokens; don't write
`font-variation-settings` by hand.

Font stacks come from the Astro Fonts API (with metric-matched fallbacks) as
`--font-fraunces` / `--font-instrument-sans`; see the `fonts` config in `astro.config.mjs`.

### Spacing

`--space-section` (`clamp(3.25rem, 6vw, 6rem)`) is the rhythm between major page
sections; `--gutter` (`clamp(1.25rem, 4vw, 2.5rem)`) is the page edge inset.

Ramp: `--space-sm .75` · `--space-md 1.25` · `--space-xl 3` · `--space-3xl 6` (rem).

> `--space-s` (1.5rem) and `--space-m` (3rem) are legacy aliases, misnamed for their
> values and used widely enough that renaming them is its own change. Don't add new uses.

### Reading measures and layout widths

**Three measures, and only three.** Pick by what the text is doing, not by what looks
right in one component — a fourth value added by eye is how a site ends up with eight of
them and no two columns aligned.

| Token              | Value    | Use                                             |
| ------------------ | -------- | ----------------------------------------------- |
| `--measure`        | `65ch`   | Long-form prose: body copy, bios, letters       |
| `--measure-narrow` | `38rem`  | A column sitting beside something else          |
| `--measure-wide`   | `46rem`  | Centred display text: hero, band intros, quotes |
| `--width-content`  | `70rem`  | Default content container (canvas)              |
| `--width-wide`     | `78rem`  | Galleries / wide blocks (`.to-wide`)            |
| `--width-shell`    | `1120px` | Header / footer / main shell                    |

### Radii, shadows, surfaces, motion

- Radii: `--radius-sm 10px`, `--radius-soft 16px`, `--radius-lg 24px` (cards/panels),
  `--radius-pill 999px`.
- Shadows: `--shadow-sm` (cards at rest), `--shadow-md` (hover / panels),
  `--shadow-lg` (heroes / lifts). All are layered and low-contrast.
- Surfaces: `--surface-gradient-soft` (warm-white → stone), `--gradient-forest`
  (shared dark-panel gradient for hero / `band--forest` / `split--forest`, so they match).
- `--grain` — SVG fractal noise applied via `body::before`, fixed, multiply-blended,
  pointer-events none.
- Easing: `--ease-out` (most transitions), `--ease-spring` (playful lifts).
- **Durations: three, matched to how far a thing moves.** `--duration-fast .2s`
  (colour and small state changes), `--duration-mid .35s` (a panel frosting, a header
  settling), `--duration-slow .6s` (something crossing the screen). Reach for the
  nearest one — transitions that _nearly_ agree read as sloppier than ones that plainly
  differ.

---

## 4. Typography utilities

Decoupled from any wrapper — usable anywhere (`layout.css`).

| Class                        | Effect                                                               |
| ---------------------------- | -------------------------------------------------------------------- |
| `.eyebrow`                   | Small uppercase moss-ink label; the standard kicker above a heading. |
| `.display`                   | `--text-display`, tight tracking — big page/section titles.          |
| `.subhead`                   | Fraunces italic, clay-ink — secondary line under a title.            |
| `.lede` / `.text-body-large` | `--text-lg` intro paragraph (`.lede` also dims to ink-soft).         |
| `.measure`                   | Cap width at `--measure`.                                            |
| `.page-intro`                | Calm, photo-less page header (see `PageIntro`, §7).                  |

Headings (`h1`–`h4`) are Fraunces 700 with the matching `--serif-*` token,
`text-wrap: balance`, and the scale sizes above. Body is Instrument Sans at
`--text-md` / `--leading-normal`. `<p>` uses `text-wrap: pretty`.

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

`.site-header`, `.site-main` and `.site-footer` are centred at `--width-shell`. `html`
has `overflow-x: clip` so full-bleed (`100vw`) sections never produce a horizontal
scrollbar — **`clip`, not `hidden`, so `position: sticky` still works.**

### `.canvas` — the one layout system

A single CSS grid that breaks out of the shell to span the viewport, then lays its
children in a centred column. Every page is built on it, 404 included. **There is no
second layout system, and there shouldn't be.**

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

- Children default to the **content column** (`--width-content`, gutter both sides).
- `.to-full` → spans the **full viewport width** (heroes, bands, splits).
- `.to-wide` → centred, capped at `--width-wide` (galleries).
- Vertical rhythm comes entirely from the grid's `row-gap: var(--space-section)` —
  **not** sibling margins. That's what makes any component work as a direct child
  regardless of order, and it's the property to protect when adding one.

`.section` is a **semantic marker with no CSS of its own**. It exists to make the
document structure readable; spacing comes from the canvas.

### Bands

Full-bleed coloured sections with re-contained inner content. Prefer the **`<Band>`**
component (§7) over hand-writing the markup.

```html
<section class="band band--forest to-full">
  <div class="band__inner">…</div>
</section>
```

Tones: `band--forest` (dark gradient, light text — headings forced white), `band--sand`,
`band--paper`. Modifiers:

- `band--narrow` / `band--centered` — cap the inner column at `--measure-wide`;
  `centered` also centres the text (closing CTAs, pull-quotes).
- `band--wash` — an opt-in, barely-there ember radial for depth in a light band. Layers
  _over_ the band's existing fill, so it composes with a tone rather than replacing it.
- `band--flush` — closes a page flush against the dark footer.

`band--flush` removes the trailing stone gap with **no per-page CSS**: global `:has()`
rules in `layout.css` zero the canvas/main/footer margins whenever one is present. Use it
only on a page's **last** band. The same rules fire on the generic `.is-flush` marker, so
a page closing on a full-bleed `<Split>` opts in the same way (`class="to-full is-flush"`).

Any page whose final element is a tinted full-bleed band **must** close flush; pages
ending on a content-width gallery or plain text already meet the page background.

---

## 6. Motion

Motion is deliberately sparse and always optional. Three systems, all in
`animations.css` except the hero's inline arming script.

### Scroll reveals

Reveals are **armed only when JS adds `reveal-ready` to `<html>`**. Without JS — or if
the script fails — nothing is hidden and content renders normally. That ordering is the
whole design: an element is never hidden by CSS that JS then has to un-hide.

- A section opts in with `data-reveal`.
- A grid or list opts into the staggered variant with `reveal-staggered` (100 ms per
  child, up to 8).

### The hero entrance

`.hero-enter` is added by an `is:inline` script that runs **synchronously, before the
hero paints** — a normal hoisted `<script>` would run too late and the content would
flash visible-then-hidden. Children rise in sequence; the primary button gets a gentle
`--ease-spring` settle, so the personality lands once.

### Reduced motion

Every animation has a `prefers-reduced-motion: reduce` path, and `animations.css` ends
with a belt-and-suspenders block that un-hides anything armed. **When adding motion,
add the reduced-motion case in the same change** — the guarantee here is that the site
is fully usable and fully visible without any animation at all.

---

## 7. Components

Props reflect each component's actual `Props` type.

### Page-level

| Component           | What it is                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Hero`**          | Full-bleed cinematic header. Takes `photos: string[]` — a cross-fading, blurred, slowly drifting stack behind the headline — or a `filename` still, or a `video`. Content anchors bottom-left under a forest scrim.                                                                                                                            |
| **`Split`**         | **The workhorse.** Asymmetric portrait photo + text; photo bleeds to the viewport edge as `.to-full`. Props: `filename`, `alt`, `reverse?`, `tone?` (`paper`/`sand`/`forest`), `eyebrow?`, `heading?`, `class?`, `id?`. For a photo-led page hero, omit `heading` and put an `<h1 class="display">` in the slot. Stacks to one column ≤ 860px. |
| **`Band`**          | Full-bleed coloured section (§5). Props: `tone?` (`sand` default), `flush?`, `narrow?`, `centered?`, `eyebrow?`, `heading?`, `class?`.                                                                                                                                                                                                         |
| **`PageIntro`**     | Calm, photo-less reading-page header: eyebrow, `display` h1, optional italic subhead, slot.                                                                                                                                                                                                                                                    |
| **`SectionHeader`** | The recurring eyebrow-over-heading pair. No styling of its own. Props: `eyebrow?`, `heading?`, `as?` (`h2` default), `id?`.                                                                                                                                                                                                                    |

### Content

| Component                          | What it is                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`MomentsSection`**               | Portrait gallery: 3-up (2-up on mobile) grid of 4:5 tiles with an editorial stagger and hover zoom. Props: `photos: string[]` (filenames — the page owns selection and order), `heading?`, `eyebrow?`, `sectionClass?`. |
| **`CardRow`**                      | A row of titled cards with body copy and an optional link. The CMS `CardRow` block maps here.                                                                                                                           |
| **`LinkCardSection`**              | A grid of navigational `.link-card` tiles (title + meta).                                                                                                                                                               |
| **`AccentList`**                   | Point cards with a moss left accent, behind the Beliefs tenets and Covenant emphases. Props: `items: {title, body}[]`, `columns?` (2 default \| 3). Renders a `<ul>` — use for sets of points, not ordered sequences.   |
| **`Roadmap`**                      | A numbered step sequence with moss markers. The ordered counterpart to `AccentList`.                                                                                                                                    |
| **`Callout`**                      | A bordered aside panel — sand fill, moss left accent — for a single point of emphasis or reassurance.                                                                                                                   |
| **`Letter`**                       | The long-form letter layout (Pastor's Letter).                                                                                                                                                                          |
| **`QuoteCarousel`**                | A rotating set of `.story-quote` cards. Pauses on hover and focus.                                                                                                                                                      |
| **`YouthMoments`**                 | The youth photo-and-caption band.                                                                                                                                                                                       |
| **`EventsBoard`** / **`EventRow`** | "What's On": chips, featured grid, weekly list, rhythms. See [events.md](./events.md).                                                                                                                                  |
| **`Photo`**                        | See §9.                                                                                                                                                                                                                 |

### The MDX block layer

`src/components/blocks/mdx/` holds thin wrappers that expose the components above to
CMS-authored MDX, adapting Keystatic's flat props to each component's real shape. They
are **not** a second component system — each one delegates. Where no adaptation is needed
the Keystatic key maps straight to the component (`Callout`, `Roadmap` do this).

`PageHero` is the one that isn't a pass-through: it renders every CMS page's `hero`
frontmatter as a reversed sand `Split`, guaranteeing a consistent page opener. See
[cms.md](./cms.md) and [development.md](./development.md#cms-built-pages).

### Cards

One surface recipe — paper fill, hairline border, `--radius-lg`, `--shadow-sm`, lift on
hover — shared by `.card`, `.link-card`, `.story-quote`, `.accent-card`, `.moment-card`
and `.service-card`. `card-grid` is `repeat(auto-fit, minmax(240px, 1fr))`.

**Link cards lift on hover; static `div.card` do not.**

> The events surfaces (`.event-card`, `.rhythm-card`, `.event-row`) use `--radius-soft`
> and a different fill — a visibly older card look that predates the current system. New
> work should use the shared recipe.

### Buttons

Three tones and one size modifier, and that is the whole system:

| Class         | Use                                                                                     |
| ------------- | --------------------------------------------------------------------------------------- |
| `.btn`        | Moss-ink fill, white text — the page's primary action.                                  |
| `.btn--ghost` | Outlined — a secondary action beside a primary one.                                     |
| `.btn--quiet` | Stone fill — a repeated, low-emphasis action that shouldn't shout 40 times down a list. |
| `.btn--sm`    | Smaller, for dense contexts: the header, table rows.                                    |

**Compose from these rather than hand-rolling a pill.** Per-component button classes
should carry layout only (margins, block display), never appearance — padding, border
weight and shadow are the things that drift first, and a set of nearly-matching buttons
is the most visible kind of inconsistency.

On dark surfaces (`.hero`, `.band--forest`, `.split--forest`) the primary `.btn`
automatically flips to a light fill so it doesn't read green-on-green.

### Other primitives

- `.section-callout` — a sand panel with a moss left accent for asides.
- `.media` / `.media__frame` / `.media__img` / `.media__caption` — framed photo and
  figure primitives.
- `.chip` / `.chip--active`, `.tag` (`utilities.css`) — pills and labels.
- `.leader-grid` / `.leader-card` (`pages.css`) — the leadership roster.

---

## 8. Header & footer

- **Header** (`nav.css`) — wordmark (a green image mask) + nav links + a "Plan a Visit"
  CTA. Collapses to a hamburger ≤ 1119px. The bar is transparent at the top; a scroll
  listener adds `.is-scrolled` to frost it (translucent stone + `backdrop-filter`),
  tighten its padding, and add a hairline. A masked, blurred `::after` skirt lets content
  dissolve under it rather than meeting a hard edge.

  On pages with a hero the header is **fixed and overlays it** (driven by
  `body:has(.hero)`), and its links, wordmark and hamburger repaint white until the page
  scrolls — which is what makes the hero read full-bleed to the top of the viewport.

- **Footer** (`footer.css`) — full-bleed forest panel with church info, footer nav, and
  social links on a faint grid texture. A closing `band--forest` flows flush into it
  (see `band--flush`, §5).

---

## 9. Photography & the image system

**Favour portrait (4:5 or taller); avoid landscape crops.**

- Photo **bytes** live in `src/assets/images/`. Photo **metadata** lives once in
  `src/content/photos.json` — `{ id, alt }` where `id` is the filename. The catalog is
  the single source of truth for `alt` and stays agnostic of where a photo is used.
- Render through **`<Photo>`**, a wrapper over Astro's `<Image>` that resolves a filename
  to bytes via `imageLoader()` and its `alt` via `photoAlt()`, emitting responsive WebP
  with intrinsic dimensions (no layout shift). Props: `filename` (or a pre-resolved
  `image`), `alt?`, `class?`, `widths?`, `sizes?`, `loading?`, `fetchpriority?`,
  `format?`. Renders nothing if the filename can't resolve.
- **Alt text:** for catalogued photos, **omit `alt`** — it's looked up by filename. Pass
  it explicitly only for logos and adornments. A decorative image needs **both** `alt=""`
  and `aria-hidden="true"`.
- Pages **select photos by filename and own the ordering**; the catalog never encodes
  usage.
- The library is deliberately larger than what the site renders, so there's a real pool
  to choose from. Don't prune the source — `prune-dist` keeps the surplus out of the deploy.

See [development.md](./development.md#the-image-system) for the pipeline.

---

## 10. Conventions & gotchas

- **Internal links** use `withBase()`; links an editor might make external use
  `resolveHref()` (`src/lib/url.ts`).
- **Scoped styles don't reach child components.** A scoped rule in a parent `.astro`
  won't style markup rendered by a child (e.g. the `<img>` inside `<Photo>`). Use
  `:global(.class)` — **but only inside an `.astro` `<style>` block.** `:global()` is
  Astro syntax, not CSS: in a plain `.css` file the browser drops the entire rule and the
  styling silently vanishes. Stylelint catches this now.
- **Prose-link `:where()` rule.** In-content links default to moss-ink via
  `:where(.site-main a:not(.link-card):not(.card))`. The `:visited` and `:hover` variants
  are written **inside** the `:where()` so they stay at zero specificity — otherwise
  `:visited` would tie `.btn` and, being later in the cascade, repaint visited buttons
  moss-on-moss. Keep any new link-state rule inside the `:where()`.
- **Full-bleed math.** `width: 100vw; margin-inline: calc(50% - 50vw)` breaks an element
  out of the shell; `html { overflow-x: clip }` absorbs the scrollbar delta.
- **Reference tokens, not literals.** Enforced by Stylelint for colour, font-size and
  border-radius. If a value genuinely has no token, add one and say what it's for.

---

## 11. Deliberate omissions

Recorded so they read as decisions rather than gaps.

- **No dark mode, and this is a real decision.** The identity is warm paper/sand/forest
  banding with photography carrying the page. The token set has no dark counterparts, and
  every on-dark override is written as a descendant of `.hero` / `.band--forest` rather
  than as a surface variable — so dark mode would mean rewriting the colour layer, and
  the result would fight the design. The audience benefit is near zero. Don't add it
  without revisiting the whole colour architecture.
- **No `@layer`.** Cascade order is `@import` sequence (§2). Worth adopting; hasn't been.
- **No container queries.** Component breakpoints are ad-hoc viewport media queries, and
  there are more distinct values than there should be.
- **No `oklch` / `color-mix`.** All colour is `rgb()`, which is why tints are written as
  literal `rgba()` rather than derived.
- **No `<ClientRouter />`.** Adding it means auditing the hand-written scripts for
  `astro:page-load` first.

---

## 12. Building a page (recipe)

A photo-led section page:

```astro
<BaseLayout title="…" description="…">
  <div class="canvas">
    <!-- Opener: portrait photo + title -->
    <Split class="to-full" filename="…" tone="sand" reverse eyebrow="…">
      <h1 class="display">Page Title</h1>
      <p class="lede">…</p>
    </Split>

    <!-- Content in the centred column -->
    <section class="section">
      <SectionHeader eyebrow="…" heading="…" />
      <p class="measure">…</p>
      <div class="card-grid">…</div>
    </section>

    <!-- A reassurance aside -->
    <Callout>…</Callout>

    <!-- A second photo beat -->
    <Split class="to-full" filename="…" tone="paper" heading="…">…</Split>

    <!-- A gallery -->
    <MomentsSection eyebrow="Life together" photos={moments} sectionClass="to-wide" />

    <!-- Closing CTA, flush into the footer -->
    <Band tone="forest" flush centered heading="Come this Sunday">
      <a class="btn" href={withBase('visit/')}>Plan a Visit</a>
    </Band>
  </div>
</BaseLayout>
```

Most pages shouldn't be hand-written at all — they belong in the CMS as MDX. See
[cms.md](./cms.md) for the block palette and which block to reach for.
