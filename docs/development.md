# Development & Architecture

How the site is built and the conventions that keep it consistent. For the visual layer
(tokens, layout, components), see [design-system.md](./design-system.md); for hosting and
deploys, see [infrastructure.md](./infrastructure.md).

---

## Stack

- **Framework:** [Astro 6](https://astro.build/) — static site generation (SSG). Fast by
  default, no server to babysit, cheap to host.
- **Language:** TypeScript.
- **Styling:** Vanilla CSS with design tokens, split into partials under `src/styles/`
  (entry: `global.css`). See [design-system.md](./design-system.md).
- **Images:** Astro's `<Image>` pipeline via the `<Photo>` wrapper component.

This is a clean, maintainable codebase designed to be handed off and extended — not a
fragile one-off.

---

## Project structure

```
src/
  assets/images/    Photo library (source for the <Image> pipeline)
  components/       Astro components (Hero, Split, MomentsSection, cards, …)
  config/site.ts    Environment-aware site/base/index config
  content/          Editable content collections (gallery, leadership, quotes, …)
  content.config.ts Collection definitions + Zod schemas
  layouts/          BaseLayout.astro (head, header, footer, skip link)
  lib/              Image registry, gallery query, URL helper, events/messages
  pages/            Routes (file-based)
  styles/           Design tokens + global CSS (entry: global.css)
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
- **Content collections.** Editable content (gallery photos, leadership, quotes, doors,
  start-here links) lives under `src/content/`, defined and validated in
  `src/content.config.ts`. Query with `getCollection(...)` and map over the results — don't
  hand-author lists in markup or add new `src/data/*.ts` arrays. Editing copy shouldn't
  mean touching layout.
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
- **Rotating "Moments" galleries are content:** each photo is a Markdown entry in the
  `gallery` collection (`src/content/gallery/`) with an `image()`, a required `alt`, plus
  `tags` / `featured` / `order`. Pages pull them via `featuredPhotos(tag)`
  (`src/lib/gallery.ts`); rotating imagery is just editing entries — no code change.
- **Page-specific images** (Split heroes, logos) use `<Photo filename="…">` directly.
- **Favor portrait imagery** (see [design-system.md](./design-system.md)).

---

## Quality & CI

- **Performance & accessibility are built in:** responsive, optimized images through a
  single pipeline; a skip link and semantic structure in `BaseLayout.astro`.
- **CI** (`.github/workflows/`) runs `format:check` and `check` on every push, and builds
  the staging target (see [infrastructure.md](./infrastructure.md)).
- There is no unit-test suite today; correctness is enforced by TypeScript (`astro
check`) and the build. Add tests alongside any non-trivial logic in `src/lib/`.
