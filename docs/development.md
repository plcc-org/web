# Development & Architecture

How the site is built and the conventions that keep it consistent. For the visual layer
(tokens, layout, components), see [design-system.md](./design-system.md); for hosting and
deploys, see [infrastructure.md](./infrastructure.md).

---

## Stack

- **Framework:** [Astro 6](https://astro.build/) — static output (SSG). Every public page is
  prerendered to HTML; only the CMS admin's two routes run on demand.
- **Language:** TypeScript.
- **Styling:** Vanilla CSS with design tokens, split into partials under `src/styles/`
  (entry: `global.css`). See [design-system.md](./design-system.md).
- **Images:** Astro's `<Image>` pipeline via the `<Photo>` wrapper component.
- **CMS:** [Keystatic](https://keystatic.com), a Git-based editor at `/keystatic`. See
  [cms.md](./cms.md).
- **Host:** Cloudflare Pages via `@astrojs/cloudflare` (`imageService: 'compile'` keeps
  images optimized at build time). See [infrastructure.md](./infrastructure.md).

This is a clean, maintainable codebase designed to be handed off and extended — not a
fragile one-off.

---

## Project structure

```
src/
  assets/images/    Photo library (source for the <Image> pipeline; CMS uploads land here)
  components/       Astro components (Hero, Split, MomentsSection, cards, …)
    blocks/         Block renderer for CMS-built pages (Blocks.astro)
  config/site.ts    Environment-aware site/base/index config
  content/          Editable content collections (photos catalog, leadership, quotes, …)
    pages/          CMS-built block pages (rendered by pages/[...slug].astro)
  content.config.ts Collection definitions + Zod schemas
  layouts/          BaseLayout.astro (head, header, footer, skip link)
  lib/              Image registry, photo catalog, URL/markdown helpers, events/messages
  pages/            Routes (file-based); [...slug].astro renders the pages collection
  styles/           Design tokens + global CSS (entry: global.css)
keystatic.config.ts Keystatic CMS config (collections/fields ↔ content.config.ts)
public/             Static assets served as-is (favicon, video, manifest)
docs/               Project documentation (you are here)
nginx/, Dockerfile  Container image for serving the built site
```

---

## Building and running

Requires Node.js (LTS) and npm.

```bash
npm install
npm run dev          # local dev server at http://localhost:4321/
npm run build        # production build to dist/
npm run preview      # preview the production build locally
npm run check        # astro check (type + template diagnostics)
npm run format        # Prettier — write
npm run format:check  # Prettier — verify only
```

> Run `npm run format` before committing. **CI runs `format:check` and `check`** — a
> formatting or type error fails the build.

---

## Conventions

- **Internal linking.** Use the `withBase()` helper (`src/lib/url.ts`) so links work under
  a subpath deploy: `href={withBase('about/')}`. Never hard-code a leading `/`.
- **Content collections.** Editable content (the photo catalog, leadership, quotes, doors,
  start-here links) lives under `src/content/`, defined and validated in
  `src/content.config.ts`. Query with `getCollection(...)` and map over the results — don't
  hand-author lists in markup or add new `src/data/*.ts` arrays. Editing copy shouldn't
  mean touching layout. Editable content is also exposed through the CMS — keep
  `keystatic.config.ts` in step with `src/content.config.ts` (see [cms.md](./cms.md)).
- **CMS-built pages** live in the `pages` collection as block lists, rendered by
  `pages/[...slug].astro` via `components/blocks/Blocks.astro`. New block types go in both
  the Zod union (`content.config.ts`) and the Keystatic block editor. See [cms.md](./cms.md).
- **Tokens & components first.** Prefer existing design tokens and components over new
  one-off CSS (see [design-system.md](./design-system.md)). Consistency is a feature.
- **Scoped styles don't reach child components.** A scoped rule in a parent `.astro`
  won't style markup rendered by a child (e.g. the `<img>` inside `<Photo>`). Use
  `:global()` for those.

---

## The image system

Photos are the primary visual material, and the pipeline keeps them fast and consistent.

- Image files live in `src/assets/images/`.
- Render through **`<Photo>`** (`src/components/Photo.astro`), a wrapper over Astro's
  `<Image>` that emits an optimized, responsive WebP with intrinsic dimensions (no layout
  shift). Pass it **either** an `image` (a resolved `ImageMetadata`, e.g. from a collection
  `image()` field) **or** a `filename` from `src/assets/images` (resolved via
  `src/lib/images.ts`). It renders nothing if a filename can't be resolved.
- **The photo catalog is the single source of truth for photo metadata.** Every editorial
  photo has one entry in `src/content/photos.json` (the `photos` collection): its `id` is
  the filename and `alt` is its description. The catalog is **agnostic of how photos are
  used** — it knows nothing about pages, sections, or order.
- **Pages drive selection.** A page names the photos it wants, by filename: `<Photo>` /
  `<Split>` / `<Hero>` take a `filename`, and `<MomentsSection photos={[…]}>` takes an
  ordered list. The `alt` is looked up from the catalog by filename (`src/lib/photos.ts`),
  so pages don't repeat it. To rotate a Moments gallery, edit the page's filename list.
- **Logos and adornments are not photos.** Ministry logos (`ecc.png`, the Kids/Youth marks),
  the Instagram/YouTube icons, and the PWA icon are _not_ in the catalog; pass their `alt`
  explicitly to `<Photo>` (or `alt=""` for decorative icons that sit beside a text label).
- **CMS page blocks carry their own photos.** Blocks on CMS-built pages (Split, Photo band,
  Captioned photo, Page header — see [cms.md](./cms.md)) store an uploaded image and its alt
  together via Keystatic `image()` fields, and render through the same `<Photo>` pipeline.
  They don't touch the catalog.
- **Favor portrait imagery** (see [design-system.md](./design-system.md)).

---

## Quality & CI

- **Performance & accessibility are built in:** responsive, optimized images through a
  single pipeline; a skip link and semantic structure in `BaseLayout.astro`.
- **CI** (`.github/workflows/`) runs `format:check`, `check`, `test`, `build`, and
  `test:site` on every push, and builds the staging target (see
  [infrastructure.md](./infrastructure.md)).
- **Tests** come in two layers:
  - `npm test` — Vitest unit tests (`test/*.test.ts`) for pure logic: `withBase()`, the
    events helpers in `src/lib/events/logic.ts` (`mapCategory`, `normalizeUpcoming`), and a
    check that every image referenced in source / the photo catalog exists in
    `src/assets/images`. Keep pure logic in dependency-free modules (no `astro:` imports) so
    it stays unit-testable.
  - `npm run test:site` — a post-build crawl of the prerendered pages (`dist/client/` under
    the Cloudflare adapter; `scripts/check-site.mjs`) that fails on broken internal links,
    content images missing `alt`, or missing key routes. Run it after `npm run build`.

> `npm run build` clears the Vite dep cache first (`prebuild`): the Cloudflare workerd build
> and `astro check` write incompatible dep caches, so a stale one would break the next run.
