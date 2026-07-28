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
design.** What it costs is a heavier build and one lost safety net.

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
| `src/pages/tina-preview/[...slug].astro`                      | renders a page from Tina's GraphQL client with `tinaField()` markers, instead of `getCollection()` + `render()`                                                                                      |
| `tinaAssetsDevPlugin` in `astro.config.mjs`                   | serves `src/assets/images` at `/assets/images/*` in dev so the media picker can show thumbnails                                                                                                      |

The significant one is the fourth. **Visual editing requires the page to be
rendered from Tina's GraphQL result, not from a compiled MDX module** — the DOM
has to carry the field metadata the bridge maps forms onto. Here that lives on a
parallel `/tina-preview/` route, gated behind `TINA_PREVIEW` so it never ships
(otherwise every page gets a duplicate URL and `check-site` fails on duplicate
descriptions). A real adoption would instead rewrite `src/pages/[...slug].astro`
itself to query Tina — which means the live site stops reading Astro content
collections and starts depending on the Tina data layer at build time.

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
`build:tina` in package.json), which starts the datalayer for the duration. In
non-local mode that server is TinaCloud, so a deploy would depend on a
third-party service being reachable — the same shape of dependency as Keystatic
Cloud, which `docs/cms.md` already calls a temporary workaround.

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

If the next step is to keep going, the honest sequencing is to do (1) for real —
convert `[...slug].astro` rather than keep a mirror route — and see what breaks,
because that is the change that can't be undone cheaply. If the answer is to
stop, the branch stands as a working reference of what Tina looks like on this
site.

## Reproducing

```bash
npm run dev:tina
```

Then:

- forms editor — `http://localhost:4321/admin/index.html`
- visual editing — `http://localhost:4321/admin/index.html#/~/tina-preview/visit`
  (click the hero; its form focuses in the sidebar)

Round-trip harness, no server needed:

```bash
node spike/roundtrip.mjs   # parse + serialize every page, report churn
node spike/idem.mjs        # confirm the serializer is idempotent
node spike/codemod.mjs     # normalise MDX to the subset Tina's parser accepts
```
