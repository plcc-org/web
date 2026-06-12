# Pine Lake Covenant Church — Prototype → Release Plan

A roadmap for taking the PLCC site from working prototype to release-worthy. Findings are
grouped into phases by priority. Phase 1 items are launch blockers; later phases improve
polish, performance, and maintainability.

**Decisions baked into this plan**

- **Hosting:** three environments — `development` (localhost), `staging` (GitHub Pages,
  `timsneath.github.io/plcc-web/`, **not** indexed), `production` (`plcc.org`, indexed).
  `site` / `base` / indexing are environment-driven, not hardcoded.
- **Events:** no Church Center API key yet. Build an **events provider abstraction** so a
  temporary scraper can stand in now and be swapped for the real API later without touching
  the page. Until then, "What's Happening" must not render an empty or stale list.
- **Stories / testimonials:** use assets already in the repo — real community photos and the
  genuine quotes in `quotes.ts`; drop the fabricated placeholder quotes/stories.

---

## Overall assessment

Strong prototype with a genuine, distinctive voice and a coherent design system. The
CLAUDE.md philosophy is actually lived in the copy (`im-new`, `plan-a-visit`, the care
pages are excellent). The gap to release is **finishing, hardening, and tightening
consistency** — not a redesign.

---

## Phase 1 — Launch blockers

### 1.1 Broken navigation (404s) — _done in this pass_

- `neighborsDoors.ts` linked to `/care-support/` and `/serve-locally/`, neither of which
  exists. Two of the five "For Our Neighbors" doors 404'd.
- **Fix:** created `/for-our-neighbors/care-support/` and `/for-our-neighbors/serve-locally/`
  (modeled on the existing neighbor subpages), seeded from the on-voice door content, and
  repointed the door hrefs. This also improves IA: the doors now lead to real hub pages.

### 1.2 "What's Happening" is empty / stale

- Every event in `events.ts` is dated Jan–Feb 2026; today is mid-2026, and the page filters
  to upcoming events → it renders nothing. Several rows use placeholder URLs
  (`.../events/XXXXXXX`) and "Tuesdays Together" is duplicated.
- **Plan:**
  1. Introduce `src/lib/events/` with a provider interface
     (`getUpcomingEvents(): Promise<Event[]>`).
  2. First implementation: a build-time scraper of the existing public Church Center /
     calendar (Playwright or fetch+parse), normalized to the existing `Event` type.
  3. Keep a small curated fallback list (real, forward-dated) for when the scrape fails.
  4. Swap to the official API later by adding one provider — no page changes.
  5. If events can't be made reliable for launch, hide "What's Happening" from nav
     (strategically incomplete) rather than ship an empty page.

### 1.3 Placeholder content visible to users — _done in this pass_

- `serve.astro` and `stories.astro` each rendered visible "Photo placeholder" labels.
- **Fix (per decisions):**
  - **Serve merged into Serve Locally.** Folded the in-church roles (Hospitality, Kids &
    Youth, Worship & Tech) into `/for-our-neighbors/serve-locally/` as a "Serve on a Sunday
    team" section; the page now covers both community partners and Sunday teams. Deleted the
    `/serve/` stub and repointed the Next Steps card to serve-locally.
  - **Stories cut for launch.** Deleted `stories.astro` (it was orphaned — not linked
    anywhere). Homepage testimonials continue via the `quotes.ts` carousel.
  - Verified the build renders **no placeholder text** anywhere. The remaining placeholder
    _fallbacks_ in `about.astro` / `community.astro` never trigger (images resolve), but could
    be hardened in a later pass.

### 1.4 SEO / indexing controls — _done in this pass_

- `robots.txt` was a static `Disallow: /` (blocks all indexing).
- **Fix:** replaced with an environment-aware `src/pages/robots.txt.ts` endpoint —
  `Disallow: /` on dev/staging, `Allow` + sitemap reference on production.

### 1.5 Environment configuration — _done in this pass_

- `astro.config.mjs` now resolves `site` / `base` from a `DEPLOY_ENV` variable
  (`development` | `staging` | `production`), with the old `GITHUB_ACTIONS` path preserved as
  the staging default. `src/config/site.ts` centralizes the per-environment values.

### 1.6 Image weight & optimization (also perf — see 2.1)

- ~14 MB of full-res Instagram JPGs + an 8.6 MB hero video, all served raw via `<img>`.
  The Astro `<Image>` component (mandated by CLAUDE.md) is used nowhere, and most `<img>`
  tags lack `width`/`height` (layout shift). This is both a blocker-level perf issue and a
  maintainability one. See Phase 2.

---

## Phase 2 — Performance & SEO

### 2.1 Adopt Astro image optimization — _done in this pass_

- Moved all photos from `public/images/` to `src/assets/images/`; added `src/lib/images.ts`
  (filename→loader registry via `import.meta.glob`) and a `<Photo>` wrapper around `<Image>`
  that emits responsive, lazy, intrinsic-sized **WebP**. Converted every `<img>` call site
  (pages + `MomentsSection`); removed `imagePublicSrc`.
- Hero-video poster now an optimized WebP via `getImage()`; nav wordmark mask uses a hashed
  `?url` import. Remote YouTube thumbnails (`messages.astro`) stay as-is (can't be locally
  optimized).
- Result: users download **only WebP** photos (responsive `srcset`); the only original-format
  asset served is the tiny footer YouTube icon. Per-image savings ~30–80%.
- _Known residual:_ the glob still emits originals for the ~unused `pickImageByAnyTag` pool
  images (~5 MB of dead weight in `dist`, never referenced/served). Could be pruned later or
  removed by replacing the random-pick pools with explicit images.

### 2.2 Social & favicon metadata — _done in this pass_

- `BaseLayout` now emits per-page **Open Graph** + **Twitter** (`summary_large_image`) tags, a
  build-generated 1200×630 social image (absolute URL via `Astro.site`), `theme-color`, SVG
  favicon (base-aware), an `apple-touch-icon` (180×180 PNG via `getImage`), and a
  `manifest.webmanifest` endpoint that generates 192/512 PNG icons.

### 2.3 Sitemap — _done in this pass_

- Added `@astrojs/sitemap` (emits when `site` is set). Production `robots.txt` already points to
  `sitemap-index.xml`; verified the URLs match per environment (staging → github.io,
  production → plcc.org).

---

## Phase 3 — Consistency & maintainability

### 3.1 One convention for page-level CSS

- Page styles currently live in two places: baked into the 1,341-line `global.css`
  (`.ethos__*`, `.leader-*`, footer) **and** in scoped `<style>` blocks (`index`,
  `pastors-letter`, a 178-line block in `messages.astro`). Pick one: prefer scoped `<style>`
  for page-specific rules, reserve `global.css` for tokens + shared primitives. Consider
  splitting `global.css` into `tokens.css` + `base.css` + `components.css`.

### 3.2 De-duplicate helpers

- `imageByFilename` is copy-pasted into `index`, `im-new`, `plan-a-visit`, `community`,
  `families`, `youth`, `for-our-neighbors`. Hoist to `homePageImages.ts` and import.

### 3.3 Split `messages.astro` (424 lines)

- Separate the YouTube RSS fetch/parse (→ `src/lib/messages/`) from the view and the 178-line
  style block. Regex XML parsing works but is fragile; isolate it behind a typed function.

### 3.4 Dead code / undefined classes

- `.measure--medium` (`index.astro:94`) and `.page__quote` (`weddings-memorials.astro:16`)
  were referenced but undefined → unstyled. _Addressed in this pass._
- `QuoteGrid` listens for `astro:after-swap` but `<ClientRouter>` isn't enabled (dead branch).
  Either enable view transitions or drop the handler.
- `serve.astro` hand-rolls `.media__frame` instead of the shared `.card` grid; `next-steps`
  uses the logo image as a card photo — normalize.

### 3.5 Tooling

- Add a link-checker (catch future 404s like 1.1), run Prettier in CI, and add a basic
  `astro check` step.

---

## Phase 4 — Voice & visual polish

### 4.1 Copy pass against CLAUDE.md guardrails

- `families.astro:179` "...no pressure" — communicate low pressure structurally, not by
  saying it. _Addressed in this pass._
- `youth.astro` "Discipleship & highlights" heading + hardcoded "May 16, 2026" date —
  reworded to evergreen. _Addressed in this pass._ (Remaining "discipleship track" wording is
  a judgment call for the full copy pass.)
- Homepage subhead "Programs and activities for all ages" leans generic / "program gravity"
  (guardrail #2) — revisit.
- `community.astro` "Community at Pine Lake takes many forms..." is generic — make it specific.

### 4.2 Testimonials & photography

- Replace fabricated quotes with attributed, real ones; ensure photos are vignettes, not
  posed stock (guardrail #7). Reconcile `quotes.ts` (homepage carousel) with `stories.astro`.

### 4.3 Hero & homepage

- Revisit hero video treatment, poster, and the welcome section rhythm once images are
  optimized.

---

## Open questions for Tim

- **Production cutover:** timeline for `plcc.org` so SEO/redirects can be staged.
- **Homepage testimonials:** `quotes.ts` still includes a few fabricated "placeholder" personas
  alongside the real quotes — replace with attributed real ones in the Phase 4 testimonial pass.

_Resolved: Stories cut for launch; Serve merged into Serve Locally; events use the live Church
Center JSON:API (no scrape needed)._
