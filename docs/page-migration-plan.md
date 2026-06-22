# Plan: migrate remaining pages into the CMS block model

**Audience:** an engineer/agent picking this up fresh. Read this top to bottom, then
[cms.md](./cms.md) and [development.md](./development.md). Work on a branch off
`feat/keystatic-cms` (where the CMS lives). This is a work plan — delete it when the
migration is done.

## Goal

Move the remaining hand-built `.astro` pages into the CMS "block" model so non-technical
editors can edit them, building the new blocks each page needs. Two pages are already
migrated and are your reference templates: `src/content/pages/church-life.mdx` and
`src/content/pages/visit.mdx`. Keep every page's URL identical.

## Guiding principle — three tiers, narrowing

Not everything that _can_ be a CMS block _should_ be. Componentization (Astro's way) and
editor-surface (the CMS) are different decisions. Apply this rule before migrating anything:

1. **Component — always.** Every element is an Astro component, single-use included. This is
   the default at the code layer regardless of CMS; it's never the question.
2. **CMS page — when the whole page is editor-territory.** An MDX entry (hero + a body of
   blocks) only when an editor will realistically need to change the page _and_ it fits the
   photo-hero-plus-blocks model.
3. **CMS block (a palette entry) — only when content repeats and a volunteer can safely
   compose it anywhere.** Every block in the "+" palette is a promise it's safe to insert on
   any page. A single-use block (e.g. a leadership grid) still shows on every other page's
   insert menu, where dropping it produces nonsense — so single-use blocks make the editor
   _worse_ for the pages that aren't them.

Astro's own guidance agrees: collections (and our block model) earn their place when you have
"multiple pieces of content that must share the same properties"; for "a small number of
different content pages," it recommends individual page components instead. So: **promote a
component to a block only when its content repeats across pages and an editor can safely
compose it. One-off, interaction-heavy, or live-data pages stay as code — they're already
components; they just aren't editor surface.**

---

## How the page-block system works (read before building)

A CMS page is an **MDX file** in `src/content/pages/` = a **hero** in frontmatter plus a
**body** of stacked **blocks**. Rendering:

- `src/pages/[...slug].astro` — loads each `pages` entry, renders the hero via
  `PageHero`, then `<Content components={…} />` for the MDX body. Holds the **components
  map** (MDX tag → wrapper). The filename is the URL slug.
- `keystatic.config.ts` (repo root) — the `pages` collection. Frontmatter fields + a
  `content: fields.mdx({ components: {...} })` whose `components` are the blocks. The
  `preview()`/`thumb()` helpers at the top render each block's in-editor `ContentView`.
- `src/content.config.ts` — the Zod schema for `pages` (frontmatter only: `title`,
  `seoDescription?`, `draft`, `hero`). The body isn't Zod-validated; it's MDX.
- `src/components/blocks/mdx/*.astro` — one thin **wrapper** per block. It takes the MDX
  props and calls the real site component. Examples to copy: `SplitMdx`, `CardRowMdx`,
  `SectionMdx`, and the data-referencing `FeaturedEventsMdx` (awaits a feed and renders).

### Adding a block — the checklist (do all four, keep them in step)

1. **Wrapper** `src/components/blocks/mdx/<Name>Mdx.astro` — reuse an existing site
   component; don't re-implement markup/CSS. Resolve any uploaded image through
   `imageFromRef` (`src/lib/images.ts`) and pass it to `<Photo image={…}>`.
2. **Keystatic** — add a `<Name>` content-component to the `pages` `fields.mdx`
   `components` (`block` for self-closing/structured, `wrapper` for ones with editable
   child prose). Give it `label`, a purpose-focused `description`, a `ContentView` using
   `preview(...)`, and a `schema`. Required text uses `validation: { isRequired: true }`;
   **all image `alt` fields are required.**
3. **Map** — import the wrapper in `[...slug].astro` and add `<Name>: <Name>Mdx` to the
   `components` object. (Internal code name = MDX tag; the editor sees the `label`.)
4. **Docs** — add a row to the block-palette table and the internal-code-name list in
   [cms.md](./cms.md).

### Hero, images, conventions

- **Hero** (frontmatter `hero`): `image`, `alt` (required), `eyebrow?`, `title`, `lede`.
  `PageHero.astro` renders it as the page `<h1>`. Hero image lives at
  `src/assets/images/<slug>/hero/image.jpg`.
- **Block images** are uploaded into `src/assets/images/<slug>/…` and referenced relative
  (`../../assets/images/<slug>/file.jpg`). When migrating, **copy** the page's images into
  that managed dir and reference them there; look up each photo's `alt` from the catalog
  `src/content/photos.json`. `imageFromRef` resolves nested paths to optimized images.
- **Tokens & components first** — never hard-code colors/sizes; reuse design tokens and the
  existing components. Match the file style of the neighboring wrappers.
- `src/content/pages/` is **Prettier-ignored** (Prettier's MDX reflow breaks block
  children). Don't reformat MDX by hand into invalid shapes; keep blank lines around block
  children (see church-life.mdx).
- Body prose gets smart typography automatically; **attribute** strings (alt, eyebrow,
  heading) do not — type curly quotes directly there if needed.

### Verification (run for every change; all must pass)

```bash
npm run format
rm -rf node_modules/.vite && npm run check      # astro check — 0 errors
rm -rf node_modules/.vite && npm run build       # must succeed
npm run test && npm run test:site                # unit + crawl (links, alt, permalinks)
```

The `rm -rf node_modules/.vite` avoids a Cloudflare-adapter dep-cache flake. **Parity
check** after migrating a page: before deleting the old `.astro`, save its built HTML
(`dist/client/<slug>/index.html`); after, diff the visible text — it should match (small,
explained diffs like a moved eyebrow are OK; fix anything else). Do **not** commit until a
page (or block) is verified.

---

## Phase 0 — enable nested page slugs (gating; do first)

`about/*` and `neighbors/*` pages have nested URLs (`/about/covenant/`, `/neighbors/care/`).
The Astro loader already globs `**/*.mdx`, but the Keystatic `pages` collection is
`path: 'src/content/pages/*'` (flat). To let Keystatic create/manage nested entries, change
it to **`path: 'src/content/pages/**'`** and confirm the slug field accepts `/`-separated
slugs (e.g. `neighbors/care`). **Verify in the running admin** (`npm run dev`→`/keystatic`)
that you can open and create a nested page before migrating any nested route. If Keystatic
can't manage nested slugs cleanly, fall back: keep nested pages as `.astro`, or store them
flat with a redirect — decide here, it gates the nested migrations.

---

## Phase 1 — build the new blocks (sequential; they share keystatic.config.ts)

Build these one at a time (each edits the shared config + map), verifying after each. Each
reuses an existing component — find it, don't re-create it.

| Block (label)       | MDX tag             | Reuses                                         | Schema (Keystatic)                                                                    | Notes                                                                                                                                                                                       |
| ------------------- | ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Key points**      | `KeyPoints`         | `AccentList.astro`                             | `columns` (select 2/3, default 2), `items` array of `{ title, body (multiline) }`     | Renders the moss-accent titled-card grid. Wrap in `<section class="section">`. Used by beliefs, covenant, vision.                                                                           |
| **Logo cards**      | `LogoCards`         | the `.card-grid`/`.card` pattern + `<Photo>`   | `cards` array of `{ image (upload), alt (req), body (multiline), linkLabel?, href? }` | Cards with a program logo + text + optional link. See `families.astro` for the exact markup/classes (`.families__program-logo`). Used by families.                                          |
| **Aside**           | `Aside`             | the `.creed-note` treatment in `beliefs.astro` | wrapper: child prose + `logo` (image, optional) + `logoAlt?`                          | A tinted 2-column note (text + small logo), stacks on mobile. Generalize `.creed-note` into the wrapper/CSS. Used by beliefs (ECC note).                                                    |
| **Neighbor doors**  | `Doors`             | `DoorCard.astro`                               | `heading?`, `count?` (integer, default all)                                           | Data block: `getCollection('neighborDoors')`, sort by `order`, slice, render `DoorCard` each. Mirror `neighbors.astro`. Keeps `neighborDoors` as a singleton (now referenced from content). |
| **Youth moments**   | `YouthMomentsBlock` | `YouthMoments.astro`                           | `eyebrow?`, `heading?`                                                                | Data block: `getCollection('youthMoments')`, sort by `order`, map to the component's `moments` shape, render. Mirror `youth.astro`.                                                         |
| **Quotes carousel** | `QuoteCarousel`     | `QuoteCarousel.astro`                          | `heading?`                                                                            | Data block (distinct from the single **Quote** block): `getCollection('quotes')`, sort by `order`, map to `{ text, by }`, render (home wraps it in a `Band` — mirror `index.astro`).        |

Two small extensions (same checklist):

- **Quote** block: add an optional `tone` (select: none / sand / forest / paper). When set,
  render the pull-quote inside a `Band` of that tone — covers the scripture "verse band" on
  `neighbors/weddings.astro`.
- **Hero logo**: add optional `logo` (image) + `logoAlt` to the `hero` object in **both**
  `keystatic.config.ts` and the `pages` `hero` Zod schema (`src/content.config.ts`).
  `PageHero.astro` renders the logo in the text column above the title when present (match
  the existing `.kids__logo` / `.youth__logo` styling). Used by kids, youth, families heroes.

---

## Phase 2 — migrate the pages (parallelizable; each writes its own .mdx)

Once the blocks exist, page migrations touch **disjoint** files (each page's `.mdx` + its
images), so they can run as **parallel** subagents. Per page, follow the recipe in
"Verification" above: build a baseline, author the `.mdx`, copy images to the managed dir,
delete the `.astro` (`git rm`), parity-check, verify gates.

### Clean — existing blocks only

`new`, `about`, `neighbors/care`, `neighbors/meals`, `neighbors/serve`,
`neighbors/stephen-ministry`. (Hero + Rich text / Text cards / Link cards / Photo gallery.
"Info cards" = **Text cards** with no link.)

### Need a Phase-1 block

| Page                 | Uses new block(s)                                                |
| -------------------- | ---------------------------------------------------------------- |
| `beliefs`            | Key points, Aside (ECC note)                                     |
| `about/covenant`     | Key points                                                       |
| `vision`             | Key points                                                       |
| `families`           | Logo cards (+ hero logo)                                         |
| `kids`               | hero logo (rest is Split / Text cards / Callout / Photo gallery) |
| `youth`              | Youth moments, hero logo, Featured events (exists)               |
| `neighbors`          | Neighbor doors                                                   |
| `neighbors/weddings` | Quote (with `tone`)                                              |
| `home` (`index`)     | Quotes carousel (+ video-hero decision, below)                   |

### Keep as code — do NOT migrate (settled)

| Page                                | Why                                                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events/index`, `events/[category]` | `EventsBoard` _is_ the page (featured + grouped weeks + rhythms + category routing). A block would just re-encode the feed logic. Keep the dynamic routes. |
| `messages`                          | Video-embed archive driven by live service data; bespoke listing.                                                                                          |
| `about/leadership`                  | Click-to-expand modal with view-transition morphing — complex single-use JS. (Already reads the `leadership` collection.)                                  |
| `about/pastors-letter`              | Bespoke two-column sticky-sidebar letter layout.                                                                                                           |

**Resolved decisions (settled — don't reopen):**

1. **The four "keep as code" pages stay as code.** Don't build single-use blocks
   (Leadership grid+modal, a Letter block, a video/embed + archive block) for them. Each
   fails the "content repeats" test and is live-data or bespoke-interaction (see the table
   above). They're already components; they just aren't editor surface. The editable _data_
   inside them (people, messages) already lives in collections — that's the right seam.
2. **`contact` stays as code.** It's text-only with no photo hero. Migrating it means
   inventing a text-only-hero page type plus a contact-details block — net-new model surface
   for one page that barely changes. Only build a no-photo page type if a _second_ such page
   appears; until then, don't migrate `contact`.
3. **Home migrates with a poster-frame hero** (do home **last**, verify by eye). `index.astro`
   opens with a background **video** hero, which the photo-only frontmatter doesn't model.
   Use a still poster frame as the hero photo (fits the existing model) rather than adding a
   single-use video option to the hero schema. The rest of home is the existing blocks plus
   the new **Quotes carousel**.

---

## Orchestration (for whoever drives the agents)

1. **Phase 0** yourself (it's small and gates everything) — verify nested slugs in the
   admin.
2. **Phase 1** — build the blocks **sequentially** (shared `keystatic.config.ts` +
   `[...slug].astro`). One subagent per block, each fully verifying, then commit. Render-
   verify data blocks (Doors/Youth moments/Quotes carousel) with a throwaway page (as was
   done for Quote/Featured events) since nothing uses them yet.
3. **Phase 2** — migrate pages with **parallel** subagents (disjoint `.mdx` files). Batch
   by area (e.g. all `neighbors/*` together, the `Key points` pages together). Review each
   agent's parity check; commit in batches with the full gate suite green.
4. Migrate **home last** and check it by eye (video hero, carousel).

Commit conventions: branch off `feat/keystatic-cms`; run `npm run format` before committing;
end commit messages with the project's `Co-Authored-By` line. Don't commit unverified work.
