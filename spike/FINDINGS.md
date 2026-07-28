# TinaCMS spike — findings

Run on branch `spike/cms-tina`, 2026-07-27, against the real site: 20 MDX pages,
18 block components, 134 photos, 55 short links.

The question was not "can Tina do this" in the abstract. Keystatic already does
what we need; the question is whether Tina matches it, given that Keystatic
shipped 40 commits in the last twelve months (mostly version bumps) against
Tina's 454.

## Verdict

**Tina matches Keystatic on content modelling and beats it on the editing
experience — but its Astro integration is incompatible with our image pipeline,
and that's a blocker, not a rough edge.**

Everything up to and including "edit a Split's prose and save" works well. The
break is at the integration layer: adding `tina()` to `astro.config.mjs` costs
us every optimised image on the site.

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
| Media picker thumbnails                          | real thumbnails                      | broken images unless `src/assets/images` is served  | **falls short** |
| Image pipeline (sharp, responsive WebP)          | intact                               | **destroyed by the `tina()` integration**           | **blocker**     |
| Visual click-to-edit on the real page            | none                                 | advertised; untested — blocked by the above         | **unknown**     |
| Keeps CMS schema and `content.config.ts` in sync | manual                               | still manual                                        | **matches**     |

## The blocker, precisely

`@tinacms/astro`'s integration forces on-demand rendering, because the editor
refetches regions from `/tina-island/[name]`. Measured against a 314-image
baseline:

| Configuration                 | Result                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| no `tina()` (baseline)        | `prune-dist: removed 44 … 314 kept` — build green                                     |
| `tina()` + Cloudflare adapter | `prune-dist: removed 121 … **0 kept**` — build "succeeds", every optimised image gone |
| `tina()`, no adapter          | build fails: `NoAdapterInstalled`                                                     |

The failure is quiet. The build exits 0. `astro.config.mjs` sets
`imageService: 'compile'` specifically to pre-optimise images at build time
rather than defer them to Cloudflare's paid runtime image endpoint; the
integration undoes that, and nothing in the build complains.

Tina's own README says `output: 'static'` is supported _if_ every editable
region is wrapped in `<TinaIsland>` with a registered island and only the island
route stays on-demand. That's the configuration worth trying next — but it means
wiring an island registry and a `tina-island/[name].ts` route, and rewriting
`[...slug].astro` to query the GraphQL client instead of `getCollection()` +
`render()`. That is a substantially bigger change than swapping a CMS, and it
was not attempted here.

## The other real costs

**Media previews.** Repo-based media _can_ point at `src/assets/images` —
`imageFromRef` (`src/lib/images.ts:36`) strips everything up to `assets/images/`,
so stored paths resolve with no code change, and the build stays green. But the
picker requests `/assets/images/<file>`, which 404s because the folder isn't
publicly served, so an editor choosing a photo sees a grid of broken images
labelled `463487542_1814552…`. Symlinking `public/assets/images` fixes the
preview immediately — verified — but then `public/` is copied into `dist/`,
adding 41 MB of unoptimised originals beside the optimised ones.

**Frontmatter reflow.** Saving any page rewrites folded YAML block scalars as
single long quoted lines. Cosmetic and one-time, but it makes future diffs on
`lede` and `seoDescription` worse.

**Wrapper prose is one level down.** Keystatic shows a `<Split>`'s markdown
inline, so a page reads top-to-bottom in the editor. Tina shows seven opaque
bars; reaching the prose is card → ⋮ → Edit → Content. For "open a page, edit
the text on a Split" — one of the two workflows that matter — that's worse,
and the promised compensation (click-to-edit on the rendered page) is exactly
what the blocker prevents testing.

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

Don't migrate on this evidence. The content model ports cleanly and the round-trip
is sound, so Tina isn't ruled out — but the integration currently costs us the
image pipeline, and the one thing that would justify the move (click-to-edit on
the real page) is behind that same wall.

The next cheap experiment, if this stays interesting, is the `<TinaIsland>`
static-editing path on a single page: wire one island, keep `output: 'static'`,
and confirm `prune-dist` still reports 314 kept. If that works, visual editing
becomes testable and the calculus changes. If it doesn't, Tina is out on
infrastructure grounds regardless of how good the editor is.

## Reproducing

```bash
node spike/roundtrip.mjs   # parse + serialize every page, report churn
node spike/idem.mjs        # confirm the serializer is idempotent
node spike/codemod.mjs     # normalise MDX to the subset Tina's parser accepts
npm run dev:tina           # admin at /admin/index.html, no account needed
```
