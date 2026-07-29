# Development & Architecture

How the site is built and the conventions that keep it consistent. For the visual layer
(tokens, layout, components), see [design-system.md](./design-system.md); for hosting and
deploys, see [infrastructure.md](./infrastructure.md); for the CMS, see [cms.md](./cms.md);
for "What's On", see [events.md](./events.md).

---

## Stack

- **Framework:** [Astro 6](https://astro.build/) — static output (SSG). Every public page is
  prerendered to HTML; only the CMS admin's two routes run on demand.
- **Language:** TypeScript.
- **Styling:** Vanilla CSS with design tokens, split into partials under `src/styles/`
  (entry: `global.css`). See [design-system.md](./design-system.md).
- **Images:** Astro's `<Image>` pipeline via the `<Photo>` wrapper component.
- **CMS:** [TinaCMS](https://tina.io), a Git-based editor at `/admin`, with visual editing. See
  [cms.md](./cms.md).
- **Host:** Cloudflare (Workers) via `@astrojs/cloudflare` (`imageService: 'compile'` keeps
  images optimized at build time). See [infrastructure.md](./infrastructure.md).

Public pages ship **no framework JavaScript** — there are no `client:*` directives
anywhere. The handful of interactive behaviours are hand-written progressive
enhancement, each with a reduced-motion path and a no-JS fallback. That's a property
worth preserving, not an accident.

---

## Project structure

```
src/
  assets/images/    Photo library (source for the <Image> pipeline; CMS uploads land here)
  components/       Astro components (Hero, Split, MomentsSection, cards, …)
    blocks/mdx/     Thin wrappers exposing site components to CMS-authored MDX
  config/
    site.ts         Environment-aware site/base/index config (resolves DEPLOY_ENV)
    church.ts       Name, address, service time — the facts that must not drift
  content/          Editable content collections
    pages/          CMS-built MDX pages (rendered by pages/[...slug].astro)
    leadership/     One file per leader
    youth-moments/  Youth photo captions
    short-links/    Redirects + 410s (NOT an Astro collection — see below)
    photos.json     The photo catalog: filename → alt
    quotes.yaml, start-here-links.yaml, events-snapshot.json
  content.config.ts Collection definitions + Zod schemas
  layouts/          BaseLayout.astro (head, header, footer, skip link, JSON-LD)
  lib/              Image registry, photo catalog, URL/markdown helpers, events, messages
  pages/            Routes (file-based); [...slug].astro renders the pages collection
  styles/           Design tokens + global CSS (entry: global.css)
scripts/            Build and verification scripts (see "The build pipeline")
test/               Vitest unit tests
tina/               TinaCMS config: config.ts (collections) + templates.mjs (block palette)
public/             Static assets served as-is (favicon, manifest, _headers)
docs/               Project documentation (you are here)
nginx/, Dockerfile  Container image for serving the built site
```

---

## Building and running

Requires Node.js (LTS — CI uses 25) and npm.

```bash
npm install
npm run dev          # local dev server at http://localhost:4321/
npm run dev:tina     # dev server + the CMS at /admin (see cms.md)
npm run build:tina   # production build to dist/ (the CMS compiles the client first)
npm run preview      # preview the production build locally
```

The full gate, in the order CI runs it:

```bash
npm run format        # Prettier — write
npm run format:check  # Prettier — verify only
npm run lint:css      # Stylelint — enforces tokens-first
npm run check         # astro check (type + template diagnostics)
npm test              # Vitest unit tests
npm run build:tina    # then:
npm run test:site     # post-build crawl of dist/
```

> Run `npm run format` before committing. Cloudflare builds and publishes whatever lands
> on `main` and does **not** run these checks — `.github/workflows/ci.yml` is the only
> gate, which is why it runs on direct pushes as well as pull requests.

---

## The build pipeline

`npm run build:tina` wraps `astro build` in `tinacms build`, which compiles the CMS
schema and generates the GraphQL client that `src/pages/[...slug].astro` queries at build
time. Plain `astro build` fails at prerendering with `fetch failed` — nothing is listening.
The Astro build itself is three steps, not one.

### `prebuild`

```
rm -rf node_modules/.vite && node scripts/generate-redirects.mjs
```

- **Clearing the Vite cache** is not superstition: the Cloudflare workerd build and
  `astro check` write mutually incompatible SSR dep caches, so a stale one surfaces as
  `The file does not exist at node_modules/.vite/deps_ssr/…` on the next run.
- **`generate-redirects.mjs`** turns the `short-links` collection into
  `public/_redirects` (gitignored — the collection is the source of truth) plus one
  generated route per `gone` entry. It validates as it goes: bad paths, duplicates,
  reserved prefixes and missing review dates all fail the build.

### `build`

`NODE_ENV=production astro build`. Both of those are load-bearing:

- **`NODE_ENV=production` is not redundant.** `tinacms build` sets `NODE_ENV=development`
  for the command it wraps, which makes `import.meta.env.PROD` false inside the Astro
  build. That inverts both `PROD` branches in the codebase at once: events fall back to
  the curated list instead of the Church Center snapshot, and draft pages get published.
  Nothing fails; you just get a development build under a production name.
- **`astro.config.mjs` pins `import.meta.env.DEPLOY_ENV`** through `vite.define` — see
  [infrastructure.md](./infrastructure.md).

### `postbuild`

`scripts/prune-dist.mjs` deletes emitted image originals that nothing references.
`src/lib/images.ts` registers the entire photo library through `import.meta.glob` (which
is what makes a photo selectable by filename), and Vite emits an original for every
registered image whether or not a page renders it. Without the prune the deploy carries
roughly 15 MB of images no page can reach. It refuses to run if it finds no HTML, and
`check-site.mjs` verifies every remaining asset reference resolves — which is what proves
the prune only ever removed unreachable files.

---

## Conventions

- **Internal linking.** Use the `withBase()` helper (`src/lib/url.ts`) so links work under
  a subpath deploy: `href={withBase('about/')}`. Never hard-code a leading `/`. For links
  that may be external or a `mailto:`/`tel:` — anything an editor can type into a CMS
  field — use `resolveHref()`, which passes those through untouched.
- **Content collections.** Editable content lives under `src/content/`, defined and
  validated in `src/content.config.ts`: `photos`, `youthMoments`, `leadership`, `quotes`,
  `startHereLinks`, `pages`. Query with `getCollection(...)` — don't hand-author lists in
  markup or add new `src/data/*.ts` arrays. Editing copy shouldn't mean touching layout.
  Keep `tina/config.ts` in step (see [cms.md](./cms.md)).
- **`short-links` is the one exception**, and deliberately so. It lives in
  `src/content/` and is edited in the CMS like everything else, but it is _not_ in
  `content.config.ts`, because nothing renders it — it's build-time configuration read
  directly by `generate-redirects.mjs`. Registering it as an Astro collection would imply
  a page could query it, which is exactly backwards.
- **Tokens & components first.** Prefer existing design tokens and components over new
  one-off CSS (see [design-system.md](./design-system.md)). This is enforced by Stylelint,
  not just asked for.
- **All CSS lives in `src/styles/`.** No `.astro` file carries a `<style>` block; a
  test enforces it. See §2 of [design-system.md](./design-system.md) for which file a
  new rule belongs in and why the site doesn't use Astro's scoped styles.
- **Don't reach for `:global()`.** It's Astro syntax that only means something inside
  an `.astro` `<style>` block. In a plain `.css` file the browser doesn't recognise the
  pseudo-class and drops the whole rule — the styling vanishes with no error. Since
  every rule now lives in a `.css` file, there's nothing left for it to do: a rule that
  needs to reach an `<img>` inside `<Photo>` is just a normal selector. Both Stylelint
  and `test/styles.test.ts` catch a stray one.

### CMS-built pages

Pages in the `pages` collection are **MDX files**, not block lists: a structured hero in
frontmatter plus a body the editor composes in the CMS's rich-text editor, inserting
components. `src/pages/[...slug].astro` fetches each page through the CMS's GraphQL client
and renders the body with `<TinaMarkdown>`, using the component map in
`src/components/blocks/tina/registry.ts`. The filename is the URL slug
(`src/content/pages/church-life.mdx` → `/church-life/`). Drafts render in dev and are
excluded from production builds.

Adding a block type means touching **two** places, and they have to agree — see
[cms.md](./cms.md) for the detail:

1. `tina/templates.mjs` — the editor UI for the block.
2. `src/components/blocks/tina/registry.ts` — **the key must match the template `name`.**
   A block with prose inside needs an adapter in `src/components/blocks/tina/`, because its
   body arrives as a `children` rich-text tree rather than a slot; a self-closing block can
   reuse its existing wrapper in `src/components/blocks/mdx/` or map straight to the real
   component (`Callout` and `Roadmap` do exactly that).

If a name isn't in the registry, the renderer emits a visible red placeholder rather than
failing the build, so a mismatch between (1) and (2) shows up on the page, not in CI —
check both.

---

## The image system

Photos are the primary visual material, and the pipeline keeps them fast and consistent.

- Image files live in `src/assets/images/`. The library is deliberately larger than what
  the site renders, so there's a real pool to select from. `prune-dist` keeps the surplus
  out of the deploy — don't prune the source.
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
- **Logos and adornments are not photos.** Partner logos (`ecc.png`), the Pine Lake Youth
  mark, the Instagram/YouTube icons and the PWA icon are _not_ in the catalog; pass their
  `alt` explicitly to `<Photo>`. A decorative image needs **both** `alt=""` and
  `aria-hidden="true"` — the crawl treats `alt=""` on its own as an oversight and fails.
- **CMS page blocks carry their own photos.** Blocks on CMS-built pages store an uploaded
  image and its alt together via CMS image fields, resolved at render time
  through `imageFromRef` rather than Astro's `image()` helper — so a fixed
  `../../assets/images/…` reference works from both flat and nested pages. They don't
  touch the catalog.
- **Favour portrait imagery** (see [design-system.md](./design-system.md)).

---

## What's enforced, and where

The repo's rules are mechanical wherever they can be, because conventions alone don't
hold — they drift back a little at a time, and each step looks harmless.

| Guard                       | Catches                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prettier**                | Formatting. `format:check` in CI.                                                                                                                                                            |
| **Stylelint**               | Non-token colours, type sizes and radii, and the full-strength accent colours used as text. Runs over `.astro` too, so a reintroduced `<style>` block is still linted rather than unchecked. |
| **`astro check`**           | Types and template diagnostics.                                                                                                                                                              |
| **Vitest** (`test/`)        | Pure logic only — no `astro:` imports, so it stays unit-testable. Plus `styles.test.ts`, which pins CSS to `src/styles/`: no `<style>` block in any `.astro`, no `:global()` in any `.css`.  |
| **`check-site.mjs`**        | Seven classes of post-build defect (below).                                                                                                                                                  |
| **CI: 410 routes in sync**  | A `short-links` edit in the CMS that never regenerated its route.                                                                                                                            |
| **CI: both deploy targets** | Environment-dependent output — `site`, sitemap, `robots.txt`.                                                                                                                                |

### The post-build crawl

`npm run test:site` crawls the built `dist/` and fails on:

1. Internal `<a href>` links that don't resolve to a generated page.
2. Content `<img>` with missing or empty `alt`.
3. `<img>` `src`/`srcset` pointing at an asset that isn't in the build.
4. Missing public permalinks — URLs promised to the outside world (yard signs, printed
   material, Google Business). Add an entry to `externalPermalinks` **only** for URLs
   referenced off-site, and say where; ordinary internal pages are already covered by (1).
5. Meta descriptions that are missing, duplicated, or leaking Markdown.
6. Short links that shadow a real page — Cloudflare resolves `_redirects` before it looks
   for an asset, so this would take a page off the site with no build error.
7. A `robots.txt` that doesn't match the target it was built for.

Several of these exist because the failure has **no symptom on the rendered page**. A
production build that isn't indexable looks perfect and simply never appears in search.

### Comparing two builds

Everything above checks one build against a rule. `npm run compare` checks a build against
_another build_ — it reduces each to what a reader sees (title, description, headings,
links, images, text) and diffs them page by page, so anything that changed but shouldn't
have shows up as a hit with no rule needed in advance.

```bash
npm run build:tina
npm run compare              # exits 1 on any difference
npm run compare -- --detail  # and show them (name pages to narrow it)
npm run compare:serve        # baseline on :4101, this build on :4102
```

The baseline is a second worktree, so it can hold whichever dependencies that revision
needs; `spike/compare-builds.mjs` documents the one-time setup. This was built to prove
the CMS migration changed nothing, and earned its keep immediately: it caught `tel:` links
rendering as `#` and a production build silently running as development — both invisible
to every check above, because each looks perfectly consistent on its own.

### Unit tests

`test/*.test.ts`, run by `npm test`:

- `url.test.ts` — `withBase()` / `resolveHref()`
- `rich-text-href.test.ts` — the href allowlist for CMS rich text, on both sides: the
  schemes the site uses keep working, and script-bearing ones stay blocked
- `events.test.ts` — `mapCategory`, `normalizeUpcoming`
- `churchcenter-map.test.ts` — HTML stripping and word-boundary truncation
- `markdown.test.ts` — `renderPlain`, including entity decoding
- `assets.test.ts` — every image referenced in source or the catalog exists on disk
- `contrast.test.ts` — the accent tokens still clear WCAG AA against the surfaces they're
  painted on, computed from `tokens.css` rather than restated

Keep pure logic in dependency-free modules so it stays testable. When you add a guard,
**break it once** to confirm it fires — a clean run proves nothing on its own.
