# The events subsystem

How "What's On" gets its data. This is the most operationally fragile part of the
codebase and the one part that depends on a third party we don't control, so it gets
its own doc.

For the rest of the codebase see [development.md](./development.md); for the CMS see
[cms.md](./cms.md).

---

## The short version

Events live in Planning Center and are published to the public through **Church
Center**, the church's public-facing Planning Center site. We read the **Planning
Center Calendar API** directly, with a personal access token.

A **nightly GitHub Action captures the calendar and commits it as a JSON file**, which
the site build reads. Capturing out-of-band rather than fetching during the build keeps
the build hermetic (a Planning Center outage can't fail a deploy), keeps the API token
in GitHub Actions rather than Cloudflare's build environment, and makes each day's
calendar change a reviewable diff.

The API serves the church's **internal** calendar — most of it is not public. Read
[the traps](#the-planning-center-traps) before touching the query or the mapper.

---

## The shape

```
Planning Center Calendar API
        │
        │  nightly, in CI, with a personal access token
        ▼
scripts/capture-events.mjs ──writes──► src/content/events-pco.json  (committed)
                                              │
                                              │  imported at build time
                                              ▼
             adapters/pco.ts ──► adapters/pco-map.ts ──► CalendarEvent[]
                                              │
        adapters/curated.ts ──────────────────┤  (fallback, and the dev default)
                                              ▼
                                    lib/events/provider.ts
                                     getUpcomingEvents()
                                              │
                          ┌───────────────────┴───────────────────┐
                          ▼                                       ▼
                pages/events/index.astro                  FeaturedEventsMdx
```

Everything upstream of `provider.ts` is replaceable. Everything downstream of it only
knows about `CalendarEvent` (`src/lib/events/types.ts`) and never learns where the
data came from. That seam is the point of the design — it's what kept the Planning
Center migration a change to one adapter rather than a change to the pages.

---

## The provider

`src/lib/events/provider.ts` is the only entry point pages use. It does four things:

1. **Selects a source.** From the `EVENTS_SOURCE` build variable if set, otherwise
   `pco` in production and `curated` in dev — dev stays fast and offline-friendly, and
   doesn't need a fresh capture in the working copy.
2. **Falls back.** Any throw, _and_ any successful-but-empty result from a non-curated
   source, drops to `curated` with a `console.warn`. "What's On" is never empty.
3. **Normalizes.** `normalizeUpcoming()` drops past events, de-duplicates by `id`, and
   sorts ascending by start.
4. **Memoizes.** One load per build process, shared across the pages that render
   events (the board and the homepage's featured strip).

`EVENTS_SOURCE` is declared as a validated Astro env enum in `astro.config.mjs`, so a
typo fails the build rather than silently falling back. Its values must stay in step
with `EventSource` in `src/lib/events/types.ts` — there's a comment on both sides.

### The three sources

| Source    | Status         | What it is                                                                                                |
| --------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `pco`     | **production** | The Planning Center Calendar API, captured daily to `src/content/events-pco.json`. Default in production. |
| `curated` | **live**       | Hand-maintained real events, generated from recurrence rules. The dev default and the permanent fallback. |
| `ics`     | not built      | A public ICS feed, if one is ever exposed. Throws; provider falls back.                                   |

`ics` exists as an enum value with a deliberate `throw` rather than as an absent case,
so the seam is visible in the code and selecting it gives a clear error rather than a
silent default.

---

## The capture pipeline

### Why it's committed rather than fetched

The capture is imported **statically** (`import capture from '…/events-pco.json'`) so
Vite inlines it into the bundle. Prerendering happens in **workerd** (the Cloudflare
adapter), which has no `node:fs`, so there is no runtime read available. Committing it
is not a caching choice — it's the only way the data can reach the build.

Fetching the API during the build was considered and rejected. Committing keeps the
build hermetic (a Planning Center outage can't fail a deploy, and can't quietly swap
the real calendar for the curated fallback mid-deploy), keeps the token in Actions
rather than Cloudflare's build environment where CMS editors can see it, makes each
day's calendar change a reviewable diff, and makes rollback a `git revert`.

### The nightly job

`.github/workflows/capture-events.yml`, 12:00 UTC (≈5am Pacific), plus manual dispatch.
It captures, then **builds and crawls the site with the fresh capture before
committing**, so a bad one can't land on `main`. In practice a commit lands every
night: the capture stamps `capturedAt` with the run's timestamp, so the file always
differs.

It needs `PCO_APP_ID` and `PCO_SECRET` as repository secrets — a Planning Center
**personal access token** (HTTP Basic), not an OAuth app. OAuth is for software acting
on behalf of _other_ organizations' users; it would mean short-lived tokens and a
refresh dance CI has nowhere to perform. Note that a PAT carries the permissions of the
person who created it and dies with their account.

The commit is also the deploy trigger: pushing to `main` starts a Cloudflare build.
That's deliberate — it replaced a separate timer-based rebuild, so there's one
mechanism instead of two. It also means the daily rebuild is what ages out past
events, since `normalizeUpcoming` evaluates "past" at build time.

### The three guards worth knowing about

- **The capture refuses to write an empty result.** A zero-event response throws rather
  than overwriting the file, because a transient API failure that returns `200` with no
  data would otherwise silently empty the calendar.
- **The capture re-verifies every row's visibility before writing** and refuses if any
  row can't be proved public. This is what catches the `include=event` trap below if
  someone edits the query.
- **The adapter warns when the capture goes stale.** Past three days, `pco.ts` logs
  `capture is N days old — is the capture workflow running?`. Not fatal — past events
  still get dropped correctly — but it's the signal that the workflow has quietly
  stopped. **This appears in the Cloudflare build log, which nobody watches.** The
  loud version lives in `test/pco-map.test.ts`: the committed-capture suite fails any
  PR once the capture is more than a week old. If the calendar ever looks thin, check
  the workflow first.

---

## Mapping and categories

`adapters/pco-map.ts` translates a Planning Center JSON:API body to `CalendarEvent[]`.
It's deliberately separate from the adapter that _supplies_ the body: nothing in the
mapper cares where the bytes came from, which is what let the previous Church Center
source be swapped out without touching anything downstream. Text cleanup shared with
any future mapper lives in `src/lib/events/text.ts`.

Rows are `EventInstance`s; the parent `Event` (via `relationships.event`) carries the
title, summary, registration URL and — critically — the public visibility flag.
`location` is a plain string on the instance, and tags hang off the instance too.

It also does the cleanup that Church Center data reliably needs:

- **Titles are trimmed.** Church Center titles routinely carry stray whitespace
  (`" High School Mission Trip "`, `"Blood Drive  "`), which otherwise reaches both the
  page and the event JSON-LD.
- **Descriptions are stripped of HTML and truncated on a word boundary** with an
  ellipsis. Church Center descriptions are written for Church Center and routinely
  overrun the card.
- **There is no title-based rental filter.** Third-party hires never carry
  `visible_in_church_center: true`, so the visibility gate is the only thing keeping a
  hall hire from reading as a PLCC program — if one is ever flagged visible, it shows.

---

## Timezones

This is the most fragile logic in the repo, and it's fragile for a boring reason: CI
runs in UTC and the church is in Pacific.

- **Rendering** (`format.ts`) always passes `timeZone: 'America/Los_Angeles'`, so the
  build host's timezone can't shift a displayed time.
- **`withinDays()`** ("this week") compares church-local `YYYY-MM-DD` strings rather
  than subtracting milliseconds. A rolling `7 × 86,400,000` window is wrong by an hour
  twice a year, and on the spring-forward Sunday it silently drops the last hour of the
  seventh day.
- **`fmtTime24()`** exists only for sorting. Series in the rhythm list have their next
  occurrence on different dates, so ordering them by instant would sort them by which
  week they fall in rather than by time of day.
- **The curated adapter** computes Pacific wall-clock dates and DST offsets explicitly
  through `Intl`, rather than trusting the host timezone.

`test/format.test.ts` covers this. Every case picks an instant where the host's answer
and the church's differ — 02:00 UTC Monday is 7pm the previous _Sunday_ in Sammamish —
so a test that only passes in Pacific fails. It's checked against `UTC`,
`Australia/Sydney` and `America/New_York`.

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

## The page: three sections, not one list

`/events/` renders `EventsBoard.astro`. It shows three
things, because the calendar holds two different kinds of event and a single dated list
serves neither:

| Section             | Holds                                             | Overlaps?                                           |
| ------------------- | ------------------------------------------------- | --------------------------------------------------- |
| **This week**       | Every occurrence in the next 7 church-local days  | Yes, deliberately — it answers "what's on now"      |
| **Coming up**       | Non-recurring events starting _after_ that window | No — anything sooner is already above               |
| **Regular rhythms** | Every recurring series, once, grouped by weekday  | Yes, deliberately — it answers "what's normally on" |

`buildSections()` in `logic.ts` owns those rules, so a test can hold them. Two are easy
to get wrong later:

- A one-off falling this week is dropped from "Coming up". The same dated thing twice on
  one screen reads as a bug.
- A recurring series stays in "Regular rhythms" **even when it also appears in This
  week**. Suppressing it would hide the Sunday service every week that it happens, which
  is every week.

**Series, not instances.** `CalendarEvent.id` is the _occurrence_ id, so it can't
collapse a recurrence — eight Sundays are eight ids. `seriesId` (Planning Center's parent
Event id) is what `groupIntoSeries()` keys on. Never key on title: the church runs two
different "Summer Meetup" series, a Sunday one at Met Market and a Wednesday one at the
farmers' market, and merging them would invent an event that doesn't exist.

**Recurring or not** is decided by `cadence`, never by counting occurrences. A five-day
camp arrives as five separate one-day occurrences of one event, so a count would file it
as a weekly rhythm. The span fallback (>14 days) exists only for a source with no cadence.

**"Regular rhythms", not "week by week"** — two of the nine series are monthly, and a
weekly label over a twice-a-month support group is a lie to someone deciding whether to
turn up.

**The section is named by what it holds, and the window is invisible.** Occurrence counts
and last dates are artefacts of the 56-day capture, so the page never says "6 more dates"
or "runs until 12 Oct". A series that genuinely ends is indistinguishable from one the
window truncated.

---

## Place: said once

Planning Center stamps `PLCC Campus - 1715 228th Ave SE, Sammamish, Washington 98075` onto
35 of 38 events. Printed per row it buried the three that are somewhere else, so
`place.ts` suppresses it: `isOnCampus()` decides, `venueLabel()` shortens what's left to a
name ("Met Market"), and the address appears once in prose near the top, from
`church.addressLine`.

A missing location counts as on-campus — that's what the curated adapter means by leaving
it off, and what `eventGraph` needs to point at the church's Place node.

**The schema.org graph keeps the raw string**, never `venueLabel()`: the page wants the
shortest name it can print, the graph wants the fullest identifier it has. `place.test.ts`
pins that, because breaking it is a one-character change nothing else would catch.

**The graph also describes only what's rendered.** `index.astro` passes
`buildSections(events).rendered` to `eventGraph`, not the raw list. The board collapses a
series to one entry, so emitting a node per occurrence would advertise dates that appear
nowhere on the page — structured data for content the reader can't see.

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

## Running it by hand

```sh
# Put PCO_APP_ID / PCO_SECRET in a gitignored .env, then:
node --env-file=.env scripts/capture-events.mjs
```

Or `npm run capture:events` with the two variables already exported. Either way it
rewrites `src/content/events-pco.json` in place; commit the result or throw it away.

Local dev doesn't need a fresh capture — `defaultSource()` picks `curated` outside
production. To render the real calendar locally, build with `EVENTS_SOURCE=pco`.

---

## What this subsystem deliberately does _not_ solve

Recorded here so it isn't mistaken for an oversight:

- **Imported descriptions are Church Center's marketing voice**, not the site's — they
  arrive with exclamation marks and URLs in body copy, both of which
  [voice.md](./voice.md) bans. Planning Center's `summary` is shorter and better written
  than the `description` the old path truncated, which narrows the problem without
  solving it. The options remain: stop rendering imported copy entirely, or add a small
  overrides map for the handful of recurring events.

Worth building against `pco`, not against the stopgap.
