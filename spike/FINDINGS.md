# TinaCMS spike — findings

Run on branch `spike/cms-tina`, 2026-07-27, against the real site: 20 MDX pages,
18 block components, 134 photos, 55 short links.

The question was not "can Tina do this" in the abstract. Keystatic already does
what we need; the question is whether Tina matches it, given that Keystatic
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
> missing images were a symptom of pages having no content at all. One adapter
> option fixes it: `prerenderEnvironment: 'node'`.

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
| Image pipeline (sharp, responsive WebP)          | 314 optimised assets                 | 314 optimised assets, with `prerenderEnvironment`   | **matches**     |
| Visual click-to-edit on the real page            | none                                 | works — click a region, its form focuses, live      | **beats**       |
| `astro check` (CI)                               | checks everything                    | OOMs unless `tina/` is excluded from the program    | **falls short** |
| Build command                                    | `astro build`                        | must wrap in `tinacms build` — needs a data server  | **falls short** |
| Keeps CMS schema and `content.config.ts` in sync | manual                               | still manual                                        | **matches**     |

## Visual editing: what it took, and what it does

It works. Clicking the hero on the rendered page focuses the Hero sub-form in the
sidebar; typing in Eyebrow updates the page live, in the real design, with the
real photo. The wiring:

| Piece                                                         | What it does                                                                                                                                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prerenderEnvironment: 'node'`                                | the fix for the 0-byte pages, above                                                                                                                                                                  |
| `src/components/blocks/tina/*.astro`                          | six wrapper adapters — under MDX a wrapper's prose arrives via `<slot />`, through Tina it's a `children` rich-text tree. The twelve self-closing blocks reuse their existing MDX adapters unchanged |
| `src/lib/tina/islands.ts` + `src/pages/tina-island/[name].ts` | the on-demand endpoint the bridge re-renders regions through. The only non-prerendered route — same shape as the two Keystatic already adds                                                          |
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
| `check-site`                     | 30 pages, 1031 links, 86 images, 376 asset refs — unchanged                                                                                |
| Suite                            | `format:check`, `lint:css`, `check` (93 files, 0 errors), 51 tests, `build:tina` all green                                                 |

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
schemas can drift, which `docs/cms.md` already documents for Keystatic.

**Every page carries an inline bootstrap script.** `<TinaIsland>` emits a
~10-line module that no-ops outside the admin iframe. Small, but it means the
production HTML is no longer byte-identical to a Tina-free build.

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

That server does **not** have to be TinaCloud. Self-hosting is a supported path
with "bring your own" git provider, database adapter and auth provider, and
there is a community starter,
[ailabs-hq/tinacms-cloudflare](https://github.com/ailabs-hq/tinacms-cloudflare),
running the whole thing on Cloudflare: Workers for the backend, Cloudflare KV as
the database adapter, Auth.js for login, GitHub as the git provider, no TinaCloud
at all. Two caveats before treating that as settled: the officially documented
backend hosts are Next.js / Vercel / Netlify functions, so Cloudflare is
community territory and that starter is Next.js rather than Astro; and Tina's
FAQ lists git-backed media, dynamic branch switching and search as TinaCloud-only
— the first of which matters here, and this spike has only exercised repo-based
media locally, never self-hosted.

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
two-schemas-must-agree burden documented in `docs/cms.md` doesn't go away.

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

## Recommendation

Tina clears the bar. Content model, round-trip fidelity, component palette and
visual editing all work on this site with real content, and the whole suite is
green: `format:check`, `lint:css`, `check` (94 files, 0 errors), 51 tests,
`build:tina`, and `check-site` at 30 pages / 1031 links / 86 images / 307
optimised WebP.

The decision is therefore not "does it work" but whether the editing upgrade is
worth three structural changes:

1. `src/pages/[...slug].astro` stops using Astro content collections and starts
   querying Tina's data layer, so the live site's render path depends on it.
2. The build depends on a Tina data server — TinaCloud in production, i.e. the
   same class of third-party dependency `docs/cms.md` already flags as temporary
   for Keystatic Cloud, on a 2-user free tier vs Keystatic's 3.
3. `tina/config.ts` leaves the type-checked program, so the CMS schema is the one
   file CI can't verify.

Against that: a genuinely better editing experience, and 454 commits a year of
development instead of 40.

Step (1) is now done, and it went better than expected: 20/20 pages identical in
images, links and alt text, 19/20 identical in visible text. Content validation
turned out not to be a casualty — zod still runs. The one open item is where the
Tina backend lives: TinaCloud is the easy answer, self-hosting on Cloudflare is
the independent one and is demonstrably possible, but nobody has done it on
Astro yet.

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
