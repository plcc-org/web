# The events subsystem

How "What's On" gets its data. This is the most operationally fragile part of the
codebase and the one part that depends on a third party we don't control, so it gets
its own doc.

For the rest of the codebase see [development.md](./development.md); for the CMS see
[cms.md](./cms.md).

---

## The short version

Events live in Planning Center and are published through **Church Center**, the
church's public-facing Planning Center site. We don't have a Planning Center API key
yet. Church Center's public calendar is a client-rendered single-page app, so there
is no HTML to parse and no token to read out of the page.

So: a **nightly GitHub Action drives a real browser**, lets Church Center's own app
authenticate itself, steals the token off the request it makes, calls the same API,
and commits the result as a JSON file. The site build reads that file.

That is a hack, and it is a deliberate one. It is marked `STOPGAP` in four places in
the source. [Replacing it](#replacing-the-snapshot-with-the-planning-center-api) is a
day's work once an API key exists.

---

## The shape

```
Church Center (Planning Center)
        │
        │  nightly, in CI, via a headless browser
        ▼
scripts/scrape-events.mjs ──writes──► src/content/events-snapshot.json  (committed)
                                              │
                                              │  imported at build time
                                              ▼
        adapters/snapshot.ts ──► adapters/churchcenter-map.ts ──► CalendarEvent[]
                                              │
        adapters/curated.ts ──────────────────┤  (fallback, and the dev default)
                                              ▼
                                    lib/events/provider.ts
                                     getUpcomingEvents()
                                              │
                    ┌─────────────────────────┼──────────────────────────┐
                    ▼                         ▼                          ▼
          pages/events/index.astro  pages/events/[category].astro  FeaturedEventsMdx
```

Everything upstream of `provider.ts` is replaceable. Everything downstream of it only
knows about `CalendarEvent` (`src/lib/events/types.ts`) and never learns where the
data came from. That seam is the point of the design — it's what makes the Planning
Center migration a change to one file rather than a change to the pages.

---

## The provider

`src/lib/events/provider.ts` is the only entry point pages use. It does four things:

1. **Selects a source.** From the `EVENTS_SOURCE` build variable if set, otherwise
   `snapshot` in production and `curated` in dev — dev stays fast and offline-friendly,
   and doesn't need a fresh snapshot in the working copy.
2. **Falls back.** Any throw, _and_ any successful-but-empty result from a non-curated
   source, drops to `curated` with a `console.warn`. "What's On" is never empty.
3. **Normalizes.** `normalizeUpcoming()` drops past events, de-duplicates by `id`, and
   sorts ascending by start.
4. **Memoizes.** One fetch per build process, shared across the five pages that need
   events (Everyone plus one per category).

`EVENTS_SOURCE` is declared as a validated Astro env enum in `astro.config.mjs`, so a
typo fails the build rather than silently falling back. Its values must stay in step
with `EventSource` in `src/lib/events/types.ts` — there's a comment on both sides.

### The four sources

| Source     | Status         | What it is                                                                                                |
| ---------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `snapshot` | **production** | The committed nightly capture. Default for production builds.                                             |
| `curated`  | **live**       | Hand-maintained real events, generated from recurrence rules. The dev default and the permanent fallback. |
| `pco`      | not built      | The official Planning Center Calendar API. Throws; provider falls back.                                   |
| `ics`      | not built      | A public ICS feed, if one is ever exposed. Throws; provider falls back.                                   |

`pco` and `ics` exist as enum values with deliberate `throw`s rather than as absent
cases, so the seam is visible in the code and selecting one gives a clear error rather
than a silent default.

---

## The snapshot pipeline

### Why a browser

Church Center's calendar API needs a Bearer "organization read token" (`ort_…`). The
token isn't in the page HTML — the SPA obtains it at runtime. A build-time `fetch()`
has nothing to authenticate with, and the site build runs in **workerd** (the
Cloudflare adapter), which can't run a browser or read the filesystem anyway.

So `scripts/scrape-events.mjs` runs out-of-band: launch Chromium, navigate to
`/calendar`, wait for the app to make its own authenticated request, intercept the
`Authorization` header, close the browser, then call the API directly with that token.

It requests the **same query** the old live adapter used — same fields, same includes,
same 56-day window — so the captured body is shape-identical to a live response. That's
what lets `churchcenter-map.ts` stay unaware of which one it's reading.

### Why it's committed rather than fetched

The snapshot is imported **statically** (`import snapshot from '…/events-snapshot.json'`)
so Vite inlines it into the bundle. Prerendering happens in workerd, which has no
`node:fs`, so there is no runtime read available. Committing it is not a caching
choice — it's the only way the data can reach the build.

### The nightly job

`.github/workflows/scrape-events.yml`, 12:00 UTC (≈5am Pacific), plus manual dispatch.
It scrapes, then **builds and crawls the site with the fresh snapshot before
committing**, so a bad capture can't land on `main`. If the snapshot is byte-identical
it commits nothing.

The commit is also the deploy trigger: pushing to `main` starts a Cloudflare build.
That's deliberate — it replaced a separate timer-based rebuild, so there's one
mechanism instead of two. It also means the daily rebuild is what ages out past
events, since `normalizeUpcoming` evaluates "past" at build time.

### The two guards worth knowing about

- **The scraper refuses to write an empty result.** A zero-event response throws rather
  than overwriting the snapshot, because a transient API failure that returns `200` with
  no data would otherwise silently empty the calendar.
- **The adapter warns when the snapshot goes stale.** Past three days,
  `snapshot.ts` logs `snapshot is N days old — is the scrape workflow running?`. Not
  fatal — past events still get dropped correctly — but it's the signal that the
  workflow has quietly stopped. **This appears in the Cloudflare build log, which nobody
  watches.** If the calendar ever looks thin, check that first.

---

## Mapping and categories

`adapters/churchcenter-map.ts` translates a Church Center JSON:API body to
`CalendarEvent[]`. It's deliberately separate from the adapter that _supplies_ the
body: the shape is Church Center's, but nothing in the mapper cares where the bytes
came from, so a Planning Center adapter reuses it unchanged.

It also does the cleanup that Church Center data reliably needs:

- **Titles are trimmed.** Church Center titles routinely carry stray whitespace
  (`" High School Mission Trip "`, `"Blood Drive  "`), which otherwise reaches both the
  page and the event JSON-LD.
- **Descriptions are stripped of HTML and truncated on a word boundary** with an
  ellipsis. Church Center descriptions are written for Church Center and routinely
  overrun the card.
- **Third-party facility rentals are excluded** by title (`EXCLUDE_TITLE`), so a hall
  hire doesn't read as a PLCC program.

### Categories

`mapCategory()` in `logic.ts` maps Church Center's category tags plus the title onto our
five coarse categories, by testing a regex ladder against `tags + title` lowercased.

**The order is load-bearing**, because events match more than one pattern. `Youth` is
tested first, then `Groups`, `Serve`, `Families`, and anything unmatched falls to
`Everyone`. A confirmation class for middle-schoolers should be Youth even though it
would also match `Families`; moving a rule up or down silently re-files events. If you
add a term, add it to the rule that should _win_, and add a case to
`test/events.test.ts`.

---

## Timezones

This is the most fragile logic in the repo, and it's fragile for a boring reason: CI
runs in UTC and the church is in Pacific.

- **Rendering** (`format.ts`) always passes `timeZone: 'America/Los_Angeles'`, so the
  build host's timezone can't shift a displayed time.
- **`weekLabel()`** computes the Sunday that starts the church-local week and returns it
  as a **UTC-midnight `Date`**, then formats it back with `timeZone: 'UTC'`. The
  round-trip is what stops the label shifting a day. It looks wrong and it is correct;
  don't "simplify" it without a test.
- **The curated adapter** computes Pacific wall-clock dates and DST offsets explicitly
  through `Intl`, rather than trusting the host timezone.

---

## Replacing the snapshot with the Planning Center API

When an API key exists, in rough order:

1. Add `src/lib/events/adapters/pco.ts`. Fetch the Calendar API with the key, and pass
   the body straight to `mapChurchCenterBody()` — Planning Center and Church Center
   serve the same JSON:API shape, which is why the mapper is a separate module.
2. Wire the `pco` case in `provider.ts` (replace the `throw`).
3. Add the key as a **secret** env field in `astro.config.mjs`'s `env.schema`
   (`access: 'secret'`), and set it in the Cloudflare dashboard.
4. Set `EVENTS_SOURCE=pco` in the Cloudflare build variables.
5. Delete `scripts/scrape-events.mjs`, `.github/workflows/scrape-events.yml`,
   `adapters/snapshot.ts`, `src/content/events-snapshot.json`, and the `playwright`
   dependency. Then re-check: the daily snapshot commit is currently what triggers the
   daily rebuild, so **something else has to age out past events** — either a scheduled
   deploy, or moving the "is it past?" filter to request time.

Step 5's last sentence is the part that's easy to miss.

Keep `curated` either way. It's the fallback that makes every other source safe to fail.

---

## What this subsystem deliberately does _not_ solve

Recorded here so it isn't mistaken for an oversight:

- **`/events/` shows every instance of a recurring event.** A weekly service appears
  once per week for the whole window, so the page reads as a calendar dump rather than
  the "curated view" its own lede promises. Collapsing a series to one row with a
  cadence needs a `series` key that Church Center's payload doesn't give us directly.
- **Imported descriptions are Church Center's marketing voice**, not the site's — they
  arrive with exclamation marks and URLs in body copy, both of which
  [voice.md](./voice.md) bans. The options are to stop rendering imported descriptions
  entirely, or to add a small overrides map for the handful of recurring events.

Both are waiting on the same thing: curation is worth building once the data source is
stable, not against a stopgap.
