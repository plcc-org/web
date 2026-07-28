# Replacing Keystatic with TinaCMS — the record

Evaluated and adopted on `spike/cms-tina`, 2026-07-27, against the real site:
20 MDX pages, 18 block components, 134 photos, 55 short links.

**Status: decided.** Keystatic is removed from this branch and Tina renders the
live pages. This document is the evidence trail and the list of what is still
open; [docs/cms.md](../docs/cms.md) is the living documentation.

The question was never "can Tina do this" in the abstract. Keystatic already did
what we need; the question was whether Tina matches it, given that Keystatic
shipped 40 commits in the last twelve months (mostly version bumps) against
Tina's 454.

## Verdict

**Tina matches Keystatic on content modelling and beats it on the editing
experience. Visual editing works on this site, on real pages, in the real
design.** What it costs is a heavier build and one lost safety net —
`astro check` can no longer type-check the CMS schema. Content validation is
_not_ a casualty: zod still runs.

> **Correction.** An earlier version of this document called the integration
> "incompatible with our image pipeline". That was wrong, and the real cause was
> worse: Tina's middleware wraps every request in `AsyncLocalStorage`, which
> workerd only provides under `nodejs_compat`. The Cloudflare adapter prerenders
> in workerd by default, so the middleware threw during prerendering and Astro
> wrote **every page out as a 0-byte file** — with the build still exiting 0. The
> missing images were a symptom of pages having no content at all. One cause, one
> fix: `nodejs_compat` in the root `wrangler.jsonc`, which the canonical starter
> ships and which we could only adopt once Keystatic was gone. Before that this
> document described two separate workarounds; both are now deleted.

## Matches / beats / falls short

|                                                  | Keystatic today                      | Tina                                                |                 |
| ------------------------------------------------ | ------------------------------------ | --------------------------------------------------- | --------------- |
| Component palette with typed fields              | yes                                  | yes — filterable insert menu, our own labels        | **matches**     |
| Wrapper children (markdown inside `<Split>`)     | inline in the document               | a nested rich-text editor, one level down           | **falls short** |
| Array-of-object props (`KeyPoints.items`)        | `fields.array(fields.object(…))`     | `type: 'object', list: true` — add/remove sub-forms | **matches**     |
| Nested `hero` object                             | `fields.object`                      | `type: 'object'`, collapsible sub-form              | **matches**     |
| YAML data files, no body                         | 3 collections, 2 singletons          | indexes all of them, nested `link` included         | **matches**     |
| Body round-trip fidelity                         | reformats on first save, then stable | same — idempotent, zero churn after first save      | **matches**     |
| Frontmatter round-trip                           | preserved                            | folded YAML scalars → long quoted lines             | **falls short** |
| Media picker thumbnails                          | real thumbnails                      | real thumbnails, via a dev-only asset route         | **matches**     |
| Image pipeline (sharp, responsive WebP)          | 314 assets kept by prune-dist        | 314 — byte-for-byte the same set                    | **matches**     |
| Visual click-to-edit on the real page            | none                                 | works — click a region, its form focuses, live      | **beats**       |
| `astro check` (CI)                               | checks everything                    | OOMs unless `tina/` is excluded from the program    | **falls short** |
| Build command                                    | `astro build`                        | must wrap in `tinacms build`; no network needed     | **falls short** |
| Keeps CMS schema and `content.config.ts` in sync | manual                               | still manual                                        | **matches**     |

## Visual editing: what it took, and what it does

It works. Clicking the hero on the rendered page focuses the Hero sub-form in the
sidebar; typing in Eyebrow updates the page live, in the real design, with the
real photo. The wiring:

| Piece                                                         | What it does                                                                                                                                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodejs_compat` in `wrangler.jsonc`                           | `node:async_hooks` for Tina's AsyncLocalStorage — needed both to prerender and to keep the deployed island route from 500ing                                                                         |
| `src/components/blocks/tina/*.astro`                          | six wrapper adapters — under MDX a wrapper's prose arrives via `<slot />`, through Tina it's a `children` rich-text tree. The twelve self-closing blocks reuse their existing MDX adapters unchanged |
| `src/lib/tina/islands.ts` + `src/pages/tina-island/[name].ts` | the on-demand endpoint the bridge re-renders regions through. The site's only non-prerendered route                                                                                                  |
| `src/pages/[...slug].astro`                                   | renders each page from Tina's GraphQL client with `tinaField()` markers, instead of `getCollection()` + `render()`                                                                                   |
| `tinaAssetsDevPlugin` in `astro.config.mjs`                   | serves `src/assets/images` at `/assets/images/*` in dev so the media picker can show thumbnails                                                                                                      |

The significant one is the fourth. **Visual editing requires the page to be
rendered from Tina's GraphQL result, not from a compiled MDX module** — the DOM
has to carry the field metadata the bridge maps forms onto.

That has since been done for real: `src/pages/[...slug].astro` now queries Tina
instead of `getCollection()` + `render()`, and the parallel preview route is
gone. Visual editing runs against the live URLs (`/visit/`, not a mirror).

## The slug conversion: what it cost

Verified against the pre-Tina baseline, across all 20 CMS pages:

| Check                            | Result                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Images, internal links, alt text | **identical on 20/20**                                                                                                                     |
| Visible text                     | **identical on 19/20** — the 20th differs only in `<FeaturedEvents>` live event data, which also drifted on the hand-built `/events/` page |
| `check-site`                     | 1031 links, 86 images, 376 asset refs — unchanged                                                                                          |
| Suite                            | `format:check`, `lint:css`, `check`, 51 tests, `build:tina` all green                                                                      |

Three things it changed, beyond the route itself:

**Smart quotes were silently lost, and are now fixed at source.** Astro's MDX
pipeline runs smartypants; Tina's renderer doesn't. Sixteen straight apostrophes
in `visit.mdx` had been rendering as `’` and started rendering as `'`. Caught by
diffing curly-quote counts (305 → 289 — exactly the 16). Fixed by normalising the
source to real `’` characters, which is the better state anyway: it no longer
depends on a render-time transform, and it survives whichever editor writes the
file. Every other page already used curly characters.

**Astro still validates the content — an earlier claim here that it didn't was
wrong.** Astro's content layer syncs and validates every collection _defined_ in
`src/content.config.ts`; it does not require a route to load one. Tested by
committing deliberately broken pages:

| Broken page                       | Caught by                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `hero` key missing entirely       | **zod** — `InvalidContentEntryDataError`, build fails. Tina's indexer accepted it happily |
| `title: 42`, `draft: "sometimes"` | **Tina's indexer** — `Unable to seed`, fails during `tinacms build` before Astro runs     |

So the two layers are complementary rather than redundant. Tina checks values
against its own field types, at save time and at index time. zod checks the
file's shape whatever wrote it — a hand edit, a bad merge, a script — and it is
what caught the missing `hero` on the page Tina itself created earlier in this
spike. Keeping both is worth doing; the cost is the familiar one, that the two
schemas can drift — the same burden `docs/cms.md` documented under Keystatic.

**Every page carries an inline bootstrap script.** `<TinaIsland>` emits a
~10-line module that no-ops outside the admin iframe. Small, but it means the
production HTML is no longer byte-identical to a Tina-free build.

## Measured against the canonical starter

[tinacms/tina-astro-starter](https://github.com/tinacms/tina-astro-starter) is
the official Astro reference, and Cloudflare is first-class in it —
`@astrojs/cloudflare` is a dependency, the adapter is auto-detected from
`WORKERS_CI`/`CF_PAGES`, and a `wrangler.jsonc` ships in the repo. Reading it
found one real bug in this spike and confirmed the rest of the wiring.

**The bug: `/tina-island` would have 500'd in production.** The starter's
`wrangler.jsonc` enables `nodejs_compat` and says why — "which the editing
route's `node:async_hooks` needs". Our generated `dist/server/wrangler.json` had
`compatibility_flags: []` while the Worker bundle imported `node:async_hooks`,
so `prerenderEnvironment: 'node'` had fixed the _build_ and left the _runtime_
broken. Silently: the build is green, and nothing fails until an editor opens
the preview on the deployed site.

Fixing it properly needed Keystatic gone. With `keystatic()` in the integrations
a root `wrangler.jsonc` fails with `Could not resolve "virtual:keystatic-config"`;
with it removed the same file builds cleanly and the flag lands. **So that
constraint in `docs/cms.md` was a Keystatic constraint, not a Cloudflare one.**
Once Keystatic was removed the two-line canonical config replaced both earlier
workarounds — the post-build flag injection _and_ `prerenderEnvironment: 'node'`,
since the flag now applies at build time as well.

**Confirmed identical to canonical:** the island registry, the
`/tina-island/[name]` route with `prerender = false`, `<TinaIsland>` wrapping a
body component, `tinaField()` markers, and rendering from
`requestWithMetadata()`. The file layout matches (`src/lib/data.ts`,
`src/lib/islands.ts`, an islands component) without having seen it first.

**Adopted from it:** `vite.ssr.noExternal` for `@tinacms/astro` and
`@tinacms/bridge`, which stops every `TinaMarkdown` import re-resolving and
recompiling the package's `.astro` sources on a cold request.

**Where we deliberately differ:** the starter's `src/content.config.ts` declares
no content collections at all — "content is sourced from TinaCMS … these
collections are unused at runtime". We keep ours, which is why zod still
validates our pages (see below). That belt-and-braces is a deviation from
canonical, and on the evidence it's the better call.

**On TinaCloud, more precisely than before.** The starter's README splits the
two things cleanly: content comes from local files (`--content=local`), while
TinaCloud credentials are needed to compile the _admin's auth_. Building without
them is `--local --skip-cloud-checks`, which is what `build:tina` does here and
why our builds have never touched TinaCloud. So the dependency was never about
content or about the build reaching a server — it is only about who is allowed
to log in to `/admin`, and self-hosted auth replaces it.

## What adopting this actually costs

**`astro check` runs out of memory.** Type-checking `tina/config.ts` — really
`defineConfig` from `tinacms` — exhausts the compiler even at
`--max-old-space-size=4096`. The workaround is excluding `tina/` from the
TypeScript program, which leaves the CMS schema as the one unchecked file in the
repo, and that is precisely where a typo costs the most. `npm run check` is part
of CI.

**The build needs a Tina data server.** `astro build` alone now fails at
prerendering with `fetch failed`, because `getStaticPaths` queries Tina's
GraphQL. The build has to become `tinacms build -c "astro build"` (see
`build:tina` in package.json), which starts the datalayer for the duration.

That server does **not** have to be TinaCloud, and the build never reaches it:
`build:tina` uses `--local --skip-cloud-checks`, so content is read from files on
disk. TinaCloud's role is authenticating editors into `/admin`, nothing else.

Self-hosting that auth is supported — bring your own git provider, database
adapter and auth provider — and Cloudflare is a first-class target in the
official Astro starter rather than community territory. For the auth backend
specifically there is also
[ailabs-hq/tinacms-cloudflare](https://github.com/ailabs-hq/tinacms-cloudflare):
Workers, Cloudflare KV as the database adapter, Auth.js for login, GitHub as the
git provider, no TinaCloud at all — though that one is Next.js, so the handler
wiring would need porting.

One caveat still unverified: Tina's FAQ lists git-backed media as TinaCloud-only.
Repo-based media works here, but only ever exercised locally.

**Stale-cache fragility.** Several builds failed until `node_modules/.vite` and
`.astro` were cleared; the repo's `prebuild` already does the former for a
reason, and adding Tina makes it matter more.

## The smaller costs

**Media.** Repo-based media points at `src/assets/images` and works: stored paths
resolve through `imageFromRef` (`src/lib/images.ts:36`) with no code change. The
picker requests `/assets/images/<file>`, which isn't publicly served, so
thumbnails 404 by default. `tinaAssetsDevPlugin` serves them in dev — real
thumbnails, folders and all. A `public/` symlink also works but copies 41 MB of
unoptimised originals into `dist/`. Production would need a deliberate answer
here; dev is solved.

**Frontmatter reflow.** Saving any page rewrites folded YAML block scalars as
single long quoted lines. Cosmetic and one-time, but it makes future diffs on
`lede` and `seoDescription` worse.

**Wrapper prose is one level down in the forms view.** Keystatic shows a
`<Split>`'s markdown inline, so a page reads top-to-bottom in the editor. Tina's
forms view shows seven opaque bars; reaching the prose is card → ⋮ → Edit →
Content. Visual editing is the compensation, and it is a real one — but it only
applies when editing through the preview, not the plain forms list.

**New pages don't validate.** A page created in Tina omits `hero`, which
`src/content.config.ts` requires, and the Astro build rejects it. Fixable by
marking hero subfields required in `tina/config.ts`, but it shows the
two-schemas-must-agree burden doesn't go away — it just changes file. **Still
open.**

## What went right, and is worth remembering

The MDX round-trip is genuinely good. All 20 pages parse and re-serialize
losslessly, the serializer is idempotent from the first save, and rendering
Tina's normal form through our existing Astro pipeline leaves 28 of 29 pages
byte-identical — the one difference being `[**X**](url)` re-nested as
`**[X](url)**`.

Getting there needed a one-time codemod (`spike/codemod.mjs`, 30 object props
and 3 bare booleans), because Tina's parser accepts only identifier keys in
object literals — `items={[{title: "A"}]}`, not the `items={[{"title":"A"}]}`
Keystatic writes — and rejects bare boolean attributes like `reverse`. Both are
surface syntax, not missing capability, and both are mechanical.

## What was decided

Tina cleared the bar and has been adopted. Content model, round-trip fidelity,
component palette and visual editing all work on this site with real content.

Keystatic is removed from the branch: `keystatic.config.ts`, both `@keystatic/*`
packages, the `patch-package` patch and its `postinstall`, and `@astrojs/react`
(nothing in `src/` imports React — the site ships none, and `react`/`react-dom`
survive only as devDependencies for the admin build). Its admin-route guards were
repointed from `/keystatic` to `/admin` and `/tina-island` across `robots.txt.ts`,
the sitemap filter, `check-site.mjs`, and the reserved short-link prefixes.

Three structural changes came with it:

1. `src/pages/[...slug].astro` renders from Tina's data layer rather than
   `getCollection()` + `render()`. Measured cost: nil — 20/20 pages identical in
   images, links and alt text, 19/20 in visible text.
2. The build must run inside `tinacms build`. It reads local files and touches no
   network, so this is a command change rather than a dependency.
3. `tina/config.ts` leaves the type-checked program because it OOMs the compiler.

Against that: a materially better editing experience, and 454 commits a year of
upstream development instead of 40.

Suite on adoption: `format:check`, `lint:css`, `check` (92 files, 0 errors), 51
tests, `build:tina`, and `check-site` fully green for the first time — 29 pages,
1031 links, 86 images, 307 optimised WebP.

## Still open

Everything unresolved is about the _deployed_ editor. Local editing is done.

| #   | Open question                                                                                                       | Why it matters                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | **Who authenticates at `/admin`** — TinaCloud (2-user free tier, $24/mo beyond) or self-hosted auth on Workers + KV | The only remaining third-party question. Builds never touch it; sign-in does                                    |
| 2   | **Production media**                                                                                                | The thumbnail route is dev-only, and Tina's FAQ lists git-backed media as TinaCloud-only. Unverified either way |
| 3   | **CMS schema is unchecked**                                                                                         | `tina/` is excluded from `astro check`, and it's where a typo costs most                                        |
| 4   | **Required fields don't agree**                                                                                     | A page created in the editor omits `hero`; zod catches it, but the editor should                                |

(1) and (2) are the ones that gate a real deploy. (3) and (4) are papercuts with
known shapes.

## Reproducing

```bash
npm run dev:tina
```

Then:

- forms editor — `http://localhost:4321/admin/index.html`
- visual editing — `http://localhost:4321/admin/index.html#/~/visit/`
  (click the hero, or any block; its form focuses in the sidebar)

Round-trip harness, no server needed:

```bash
node spike/roundtrip.mjs   # parse + serialize every page, report churn
node spike/idem.mjs        # confirm the serializer is idempotent
node spike/codemod.mjs     # normalise MDX to the subset Tina's parser accepts
```
