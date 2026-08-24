# The events subsystem

How "What's On" gets its data. This is the most operationally fragile part of the
codebase and the one part that depends on a third party we don't control, so it gets
its own doc.

For the rest of the codebase see [development.md](./development.md); for the CMS see
[cms.md](./cms.md).

---

## The short version

Events live in Planning Center and are published through **Church Center**, the
church's public-facing Planning Center site.

A **nightly GitHub Action captures the calendar and commits it as a JSON file**, which
the site build reads. Capturing out-of-band rather than fetching during the build keeps
the build hermetic (a Planning Center outage can't fail a deploy), keeps the API token
in GitHub Actions rather than Cloudflare's build environment, and makes each day's
calendar change a reviewable diff.

Two capture paths exist during the migration:

- **`pco`** — the official Planning Center Calendar API, authenticated with a personal
  access token. Built and at parity; see [the traps](#the-planning-center-traps).
- **`snapshot`** — the outgoing stopgap. Church Center's public calendar is a
  client-rendered SPA with no token in the page, so this drives a real browser, steals
  the Bearer token off the request the SPA makes, and calls the same API. Still the
  production default until the cutover completes.

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
| `snapshot` | **production** | The committed nightly Church Center capture. Default for production builds. Outgoing.                     |
| `curated`  | **live**       | Hand-maintained real events, generated from recurrence rules. The dev default and the permanent fallback. |
| `pco`      | **built**      | The official Planning Center Calendar API, captured daily to `src/content/events-pco.json`.               |
| `ics`      | not built      | A public ICS feed, if one is ever exposed. Throws; provider falls back.                                   |

`ics` exists as an enum value with a deliberate `throw` rather than as an absent case,
so the seam is visible in the code and selecting it gives a clear error rather than a
silent default.

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
`CalendarEvent[]`, and `adapters/pco-map.ts` does the same for Planning Center. Each is
separate from the adapter that _supplies_ the body, so neither cares where the bytes
came from.

**They are two mappers, not one.** Both APIs speak JSON:API, but the resources differ:
Church Center rows are already one-per-occurrence `Event`s with the location and
category tags as included resources; Planning Center rows are `EventInstance`s whose
parent `Event` carries the title, summary and visibility, with location as a plain
string and tags hanging off the instance. Shared text cleanup lives in
`src/lib/events/text.ts`.

It also does the cleanup that Church Center data reliably needs:

- **Titles are trimmed.** Church Center titles routinely carry stray whitespace
  (`" High School Mission Trip "`, `"Blood Drive  "`), which otherwise reaches both the
  page and the event JSON-LD.
- **Descriptions are stripped of HTML and truncated on a word boundary** with an
  ellipsis. Church Center descriptions are written for Church Center and routinely
  overrun the card.
- **Third-party facility rentals are excluded** by title (`EXCLUDE_TITLE`), so a hall
  hire doesn't read as a PLCC program.

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

## The Planning Center traps

Three things about the Calendar API that are not in its docs and cost real debugging.
All three are guarded in code; none of them fail loudly on their own.

### The visibility filter is silently ignored without `include=event`

`where[event][visible_in_church_center]=true` is a join filter. **Without
`include=event` in the same query it does nothing** — no error, no warning, a `200`
with the entire internal calendar:

| query                                             | rows |
| ------------------------------------------------- | ---- |
| 56-day window only                                | 164  |
| window + `where[event][visible_in_church_center]` | 164  |
| window + `include=event`                          | 164  |
| window + `include=event` + `where[…]=true`        | 38   |

This matters because the API serves the **internal** calendar. Of the church's 874
events, **680 are not public** — staff meetings, room blockouts, outside-hirer
bookings, `Reserved for Worship Rehearsal`. Dropping one query parameter publishes all
of it to plcc.org.

So the mapper-side check in `pco-map.ts` is **the authority**, not defence in depth: a
row whose parent `Event` is missing, or not explicitly `visible_in_church_center: true`,
is dropped. `capture-events.mjs` re-verifies every row before writing and refuses to
overwrite the file if any row is unverifiable.

### A sparse fieldset strips relationships, not just attributes

`fields[EventInstance]=name,starts_at,…` also removes the `event` and `tags`
**relationships** unless they're named in the list. The failure is quiet: the rows look
fine, but every parent link is gone, so visibility can't be checked and tags read as
empty. Both are named explicitly in the capture query. Don't trim that list.

### `starts_at` is not the time the public is told

Events can reserve setup/teardown buffer. `starts_at` is the internal booking;
`published_starts_at` is what Church Center advertises. Five of the church's recurring
instances reserve an hour — mapping `starts_at` puts the playgroup and the dementia
support group on the site **an hour before they begin**. The mapper reads
`published_starts_at ?? starts_at`.

### Also worth knowing

- **`kind` is opt-in.** Planning Center omits it unless `fields[EventInstance]` names
  it. The mapper drops `blockout` rows on it, so it must stay in the query.
- **Pin `x-pco-api-version`.** `2020-06-16` serves Event `details` with no `summary`
  field at all — the copy the cards render. "Latest" drifts; the capture pins
  `2026-06-22`.
- **`featured` is `false` on every event.** Nothing reads `CalendarEvent.featured`, so
  this costs nothing today, but don't build on it.
- **There is only one calendar** (`Pine Lake Covenant Church`), so events can't be
  scoped by calendar. Visibility and tags are the only levers.

---

## Categories, tags first

`resolveCategory()` in `logic.ts` tries real Planning Center tags before falling back to
the title regex ladder.

Tags are authoritative **only when they name one of the four specific categories**
(`Youth`, `Children & Families`, `Congregational Care`, `Missions / Service`, the group
tags). Tags that would mean `Everyone` — `Worship`, `Community Event`, `Meeting`,
`Adults` — are deliberately **not** in the map: they are the absence of a signal, and
treating them as one would shadow the ladder. `Blood Drive` carries only
`Community Event` but belongs in Serve, and the ladder is what finds it.

The ladder stays because Planning Center tagging is inconsistent — `Newcomers Brunch`
carries no tags at all. **Its order is still load-bearing**; see below.

`mapCategory()` maps Church Center's category tags plus the title onto our five coarse
categories, by testing a regex ladder against `tags + title` lowercased.

**The order is load-bearing**, because events match more than one pattern. `Youth` is
tested first, then `Groups`, `Serve`, `Families`, and anything unmatched falls to
`Everyone`. A confirmation class for middle-schoolers should be Youth even though it
would also match `Families`; moving a rule up or down silently re-files events. If you
add a term, add it to the rule that should _win_, and add a case to
`test/events.test.ts`.

---

## Finishing the cutover

`pco` is built and verified at parity — a fresh capture from each source over the same
56-day window produces **38 identical events, zero category differences**. What remains:

1. Add `PCO_APP_ID` / `PCO_SECRET` as GitHub Actions repository secrets.
2. Replace `.github/workflows/scrape-events.yml` with the same job running
   `npm run capture:events`. Drop the `playwright install` step.
3. Set `EVENTS_SOURCE=pco` in the Cloudflare build variables, and flip `defaultSource()`
   in `provider.ts` from `snapshot` to `pco`.
4. Delete `scripts/scrape-events.mjs`, `adapters/snapshot.ts`,
   `src/content/events-snapshot.json`, `adapters/churchcenter-map.ts`,
   `test/churchcenter-map.test.ts`, and the `playwright` dependency.

The daily commit stays the deploy trigger, so **nothing needs to replace the
rebuild-ages-out-past-events mechanism** — that was only a risk in the abandoned
live-fetch design.

Keep `curated` either way. It's the fallback that makes every other source safe to fail.

---

## What this subsystem deliberately does _not_ solve

Recorded here so it isn't mistaken for an oversight:

- **`/events/` shows every instance of a recurring event.** A weekly service appears
  once per week for the whole window, so the page reads as a calendar dump rather than
  the "curated view" its own lede promises. **Planning Center unblocks this**: every
  `EventInstance` carries `relationships.event`, a real series key Church Center never
  gave us. The current window is 38 instances across just 13 parent events, and
  `compact_recurrence_description` supplies the cadence ("Every Sunday", "The second
  Wednesday of every month") ready-made. Worth doing once the cutover lands.
- **Imported descriptions are Church Center's marketing voice**, not the site's — they
  arrive with exclamation marks and URLs in body copy, both of which
  [voice.md](./voice.md) bans. Planning Center's `summary` is shorter and better written
  than the `description` the old path truncated, which narrows the problem without
  solving it. The options remain: stop rendering imported copy entirely, or add a small
  overrides map for the handful of recurring events.

Both are worth building against `pco`, not against the stopgap.
