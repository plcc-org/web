# Feature Plan: Live Events / "What's Happening"

Goal: replace the hardcoded, now-stale `src/data/events.ts` with real Pine Lake events,
rendered in our own design, sourced from Church Center / Planning Center — built so the data
source can be swapped (temporary approach → official API) without touching the page.

---

## What we learned (investigation)

The existing calendar lives at `https://plcc.org/connect/resources/calendar/`, which embeds
the church's **Church Center** calendar.

- Both `plcc.org/.../calendar/` and `plcc.churchcenter.com/calendar` are **client-rendered SPA
  shells** — no event titles/dates exist in the static HTML. **A plain HTML scrape returns
  nothing.**
- The Planning Center org id is **65711**.
- `GET api.churchcenter.com/calendar/v2/published_events` → **HTTP 401** (not 404): the public
  calendar backend exists but requires the auth headers the SPA sends.
- The org subdomain's `.ics` route responds with `text/calendar` but needs a valid public
  subscription token.
- Official, documented path: **Planning Center Calendar API**
  `GET https://api.planningcenteronline.com/calendar/v2/event_instances` (needs a token).

**Implication:** the right solution is to consume a real Church Center / PCO data feed, not
scrape rendered HTML.

---

## Constraints that shape the design

1. **Static site (SSG) on GitHub Pages.** There is no server at runtime. Events are baked at
   **build time**. Freshness therefore depends on build cadence → we need scheduled rebuilds.
2. **No API key today** (but a Planning Center Personal Access Token is self-serve for an org
   admin — possibly obtainable sooner than the full "official integration").
3. **CORS.** A browser on `plcc.org` cannot directly `fetch()` `churchcenter.com` JSON/ICS
   (no `Access-Control-Allow-Origin`). So client-side fetching is **not** viable without a
   proxy → reinforces the build-time approach.
4. **Philosophy (CLAUDE.md).** "What's Happening" is a high-signal, curated surface, not an
   exhaustive dump of every calendar entry. It must **degrade gracefully** (never show an
   empty page) and stay evergreen in tone.

---

## Architecture: a swappable events provider

One domain type and one interface; everything else is an adapter. The page and homepage
import only `getUpcomingEvents()` and never know the source.

```
src/lib/events/
  types.ts            # CalendarEvent domain type (supersedes data/events.ts Event)
  provider.ts         # getUpcomingEvents(): Promise<CalendarEvent[]>  — selects adapter by env/config
  normalize.ts        # raw → CalendarEvent: dedupe, expand recurrences, filter window, map categories/tags
  curation.ts         # include/exclude rules, category & tag mapping, featured selection
  cache.ts            # read/write last-good snapshot (events.cache.json) for resilience
  adapters/
    ics.ts            # Adapter A: parse a public iCal feed (RFC 5545)
    pco-api.ts        # Adapter B: Planning Center Calendar API (token)
    churchcenter.ts   # Adapter C: headless/SPA capture (stopgap)
    curated.ts        # Adapter D: hand-maintained fallback list (today's events.ts, refreshed)
```

- `provider.ts` picks the adapter from config/env (e.g. `EVENTS_SOURCE=ics|pco|curated`),
  fetches, runs `normalize` + `curation`, and on any failure falls back to the cached snapshot,
  then to the curated list — so the page is never empty.
- `whats-happening.astro` and the homepage keep their current rendering; only the import
  changes from `data/events` to `lib/events/provider`. The `Event` shape is preserved (or
  widened) so no template churn.

### Domain type (sketch)

```ts
export type CalendarEvent = {
  id: string                 // stable id from source (for dedupe + keys)
  title: string
  start: string              // ISO with tz offset
  end?: string
  allDay?: boolean
  location?: string
  summary?: string           // short, curated description
  url: string                // Church Center event/registration link
  category: EventCategory    // mapped from source
  tags?: EventTag[]
  featured?: boolean
  source: 'ics' | 'pco' | 'churchcenter' | 'curated'
}
```

---

## Data source options (ranked)

### Option A — Public iCal/ICS feed  ★ recommended near-term
- **How:** church admin publishes the public calendar on Church Center and shares the public
  **subscribe/iCal URL** (token-bearing but public — no login). We parse it at build time with
  a small ICS library; RRULE recurrence expansion comes for free.
- **Pros:** no API secret, stable standardized format, no browser, low maintenance.
- **Cons:** needs the church to expose a *public* calendar feed (some configs only expose the
  personal schedule feed); ICS lacks our category taxonomy → we map via `curation.ts`.
- **Unblocker:** Tim obtains the public calendar feed URL from Church Center Calendar admin
  ("Show events on Church Center" → public calendar → Subscribe / feed link).

### Option B — Planning Center Calendar API  ★ best long-term ("the real way")
- **How:** `GET /calendar/v2/event_instances?filter=published&where[starts_at][gte]=…` with a
  PCO **Personal Access Token** (App ID + Secret), stored as a GitHub Actions secret. Rich,
  documented JSON; can include event, tags, and registration links.
- **Pros:** authoritative, filterable, includes metadata ICS can't; clean migration target.
- **Cons:** secret must live in CI (never client-side); slightly more code (pagination, includes).
- **Unblocker:** generate a PAT at `api.planningcenteronline.com` (self-serve for an admin).

### Option C — Headless capture (Playwright)  — stopgap only
- **How:** in CI, load the public calendar SPA, capture the JSON it requests from
  `api.churchcenter.com`, normalize it. (Or scrape the rendered DOM.)
- **Pros:** works with zero credentials right now.
- **Cons:** fragile (endpoint/DOM can change), heavy CI (browser download ~300MB), gray-area
  re: replaying an internal endpoint. Use only if A and B are both blocked, and keep it behind
  the same adapter interface so it's trivially removed later.

### Option D — Curated fallback list  — always present
- Keep a small, **real, forward-dated** hand list (the current `events.ts`, cleaned up:
  remove `XXXXXXX` placeholder URLs and duplicate "Tuesdays Together"). Used as the resilience
  fallback and for launch if A/B/C aren't ready in time.

**Recommended path:** ship **D** cleaned-up immediately (unblocks launch today), wire **A** as
the live source as soon as Tim has the feed URL, and treat **B** as the eventual migration. C
only if needed.

---

## Freshness on a static site

- **Scheduled rebuild:** add a GitHub Actions `schedule:` cron (e.g. daily ~05:00 PT) that
  rebuilds and redeploys, so build-time event data refreshes without manual pushes.
- **Resilient cache:** persist a last-good `events.cache.json` (committed by the workflow or
  stored as an artifact). If a build's fetch fails, fall back to cache → then curated list, so
  a Church Center outage never empties the page.
- **No client-side fetch** (CORS); revisit only if a proxy/Worker is ever introduced.

---

## Curation & rendering rules (keep it high-signal)

- **Filter window:** upcoming ~6–8 weeks; cap the list; group by week (current page already
  does this).
- **Category/tag mapping:** source categories → our `EventCategory`/`EventTag` via a small
  table in `curation.ts`, with an include/exclude list so internal-only items (e.g. facility
  bookings) don't surface.
- **Recurring events:** collapse to the next N instances rather than listing every occurrence.
- **Empty state:** if no events qualify, show a graceful module (e.g. "Our weekly rhythms" +
  a link to the full Church Center calendar) — never a blank page. Or hide the nav item until
  populated, per "strategically incomplete."
- **Links:** every event deep-links to its Church Center page/registration.

---

## Phased implementation

1. **Refactor to the abstraction (no behavior change).** Introduce `src/lib/events/` with the
   domain type, `provider.ts`, and the `curated` adapter backed by a cleaned-up list. Point
   `whats-happening.astro` + homepage at the provider. Remove placeholder/dup rows. _Ships now;
   makes the page correct and sets up the seam._
2. **Add the ICS adapter (Option A)** once Tim supplies the public feed URL. Add `normalize`
   (recurrence, window) + `curation` (mapping). Cache last-good snapshot.
3. **Scheduled rebuild + cache resilience** in GitHub Actions.
4. **Migrate to PCO API (Option B)** when a token is available; flip `EVENTS_SOURCE=pco`.
   Remove the stopgap if C was ever used.
5. **Polish:** empty-state module, featured selection, category chips QA.

---

## Decisions (locked)

1. **Live source:** neither an ICS feed nor a PCO token is available soon → build the
   **Playwright headless-capture stopgap (Option C)** on top of the curated fallback, behind
   the provider interface so it's trivially swapped for A/B later.
2. **Launch behavior:** keep "What's Happening" live with the **curated list** (no hiding).
3. **Freshness:** **daily GitHub Actions rebuild** approved.

## Update: Option C got much cheaper — no Playwright needed

Investigation of the live calendar showed the public Church Center calendar is backed by a
plain **JSON:API** that needs no login and no headless browser — just a short-lived public
"organization read token" obtained via a three-step HTTP handshake:

1. `GET  /calendar` → session cookie + `<meta name="csrf-token">`
2. `POST /sessions/tokens` (cookie + CSRF) → `{ data.attributes.token: "ort_…" }` (2-hr expiry)
3. `GET  api.churchcenter.com/calendar/v2/events?…` with `Authorization: Bearer ort_…` and
   `X-PCO-API-Version: 2020-06-16`

The events endpoint returns recurring occurrences already expanded within a date window, plus
location, category tags, and registration URLs. So the "Playwright stopgap" became a
**dependency-free `fetch` adapter** — lighter, faster, and more reliable in CI. (Org id 65711.)

## Status

- ✅ **Phase 1 (abstraction + curated) — done.** `src/lib/events/`
  (`types.ts`, `provider.ts`, `adapters/curated.ts`); `whats-happening.astro` reads
  `getUpcomingEvents()`; deleted the stale `src/data/events.ts`. Curated adapter generates real
  upcoming Sundays from a recurrence rule (no invented dates); `fixedEvents[]` slot for
  one-offs.
- ✅ **Live Church Center adapter — done** (`adapters/churchcenter.ts`). Pure `fetch`
  handshake; maps JSON:API → `CalendarEvent`; keyword category mapping; a curation
  `EXCLUDE_TITLE` list (currently drops third-party "Pedalheads" facility rentals). **No
  Playwright** — the package was removed.
- ✅ **Source selection.** `EVENTS_SOURCE` overrides; default is **live (`churchcenter`) for
  production builds, `curated` for dev** (fast/offline). On any live failure the provider falls
  back to curated, so the page is never empty (verified).
- ✅ **Timezone fix.** Church Center returns UTC instants; `whats-happening.astro` now formats
  all dates/times in `America/Los_Angeles`, so CI's UTC build no longer shifts times
  (Sunday Service correctly shows 10:00 AM).
- ✅ **Daily rebuild — done.** `schedule` + `workflow_dispatch` in `deploy.yml` (13:00 UTC).
- ⬜ **Phase 3 — migrate to a public ICS feed (A) or PCO API token (B)** if/when available;
  flip `EVENTS_SOURCE` and retire the read-token handshake.

## Risks / notes

- The `ort_` read-token rotates and is fetched fresh each build, so there's nothing to
  hardcode. If Church Center changes the handshake or endpoint, the adapter throws and the page
  falls back to curated until fixed; the daily rebuild self-heals transient outages.
- **Curation is keyword-based.** Category mapping and the exclude list are heuristics — review
  what surfaces (e.g. "Blood Drive", facility rentals) and tune `mapCategory` / `EXCLUDE_TITLE`.
- **No build-time cache yet.** A failed live fetch falls straight back to curated for that
  build. A last-good cache (persisted via `actions/cache`) is a possible future enhancement.

## Open items for Tim

- Review the live event list on `/whats-happening/` and tell me what to **exclude or
  re-categorize** (third-party rentals, internal-only items).
- Optional: a **public iCal feed URL** or **PCO API token** would let us retire the
  read-token handshake for something more officially supported.
