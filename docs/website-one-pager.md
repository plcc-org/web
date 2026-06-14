# The New Pine Lake Website — What Changed and Why

A short brief on the redesign: the goal, the thinking behind it, the language and
structure, and how it's built. Written to be read in five minutes.

---

## The goal

The old site was built on a **broadcast** model — here's everything we do, come find
us. The new site is built on a **belonging** model — here's what life here feels
like, and where you might fit.

That's not a cosmetic change. We rebuilt the site around a single question a first-time
visitor is actually asking: _"Could this be a place for me and my family?"_ Everything
else is in service of answering that honestly.

The primary audience is **people outside the church** — young families and first-time
guests — not the people already here. Insiders can navigate any site; newcomers can't.
So we optimized for the newcomer, on purpose.

---

## The core idea: a filter, not a sales pitch

We are **not** trying to convince everyone to come. We're helping the **right people
recognize themselves** — and helping others self-select out, with no hard feelings.

This reframes the whole writing job. The test for any sentence is simple:

> **If it could describe any church, it's too generic to keep.**

Generic copy ("we're a welcoming community on a journey") reassures insiders and tells
a newcomer nothing. Specific, human signals do the real work: _"Sundays at 10am,"_
_"K–5 students stay in the service one Sunday a month,"_ _"all volunteers are
background-checked."_ Concrete beats warm-and-vague every time.

A related principle we call **the Doors model**: organize around _how the church shows
up in people's lives_, not around our internal departments. A newcomer doesn't search
for "the Care Ministry" — they're having a hard week and wondering if anyone would
help. We lead with the situation, then offer a specific door.

---

## The language

The voice is **grounded, human, and understated** — warm, but not soft. We strip out
marketing fluff and church insider-speak, because both erode trust with the exact
people we're trying to reach.

| We avoid                                            | Because                               | We prefer                                                           |
| --------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| "Fellowship," "discipleship," "plug in," "outreach" | Jargon that assumes you're already in | "Connection," "support," "find a place," "learning to follow Jesus" |
| "We'd love to invite you on a journey…"             | Too soft; says nothing                | "Visiting a church can feel awkward. Here's what actually happens." |
| "Other ministries we offer…"                        | Program gravity — a list nobody reads | Group content around real life situations                           |
| Repeating "no pressure" everywhere                  | Protesting too much                   | Communicate low pressure through _structure and clarity_            |

Two non-negotiables that keep us honest:

- **Belief-neutral, but not diluted.** We don't assume the reader is Christian, and we
  never require agreement to belong — but we also don't hide our convictions or water
  them down. Welcoming and distinctive at the same time.
- **Evergreen copy.** Anything that changes often (event times, schedules) lives in a
  dedicated module like the Calendar — never baked into narrative pages that should
  stay true for years.

---

## The structure (information architecture)

The site is a **three-stage funnel**, plus a parallel path for the wider community.
It is **intentionally asymmetric** — we only built pages where there's real content and
a real need, and the emotional order of the pages is deliberate:

1. **Home** → _"I might belong here."_
2. **I'm New / Families / Youth** → _"I understand what this would feel like."_
3. **For Our Neighbors / Next Steps** → _"I can engage at my own pace."_

Primary navigation:

- **I'm New** — the front door; answers the practical and emotional questions a guest has.
- **About** — who we are, what we believe, leadership, ethos.
- **Families** — kids, youth, and family life.
- **For Our Neighbors** — organized around _needs_, not departments (the Doors model).
- **What's Happening / Messages** — current events and the sermon archive.

This is a **high-signal front door, not an exhaustive catalog.** Strategic
incompleteness is a feature: a clear, confident site beats a complete-but-cluttered
one. We add pages when readiness and real content justify them — not for symmetry.

---

## How it's built (for the team that will own it)

This isn't a fragile one-off. It's a clean, modern, maintainable codebase designed to
be handed off and extended.

- **Stack:** [Astro](https://astro.build/) + TypeScript, static-site generation. Fast
  by default, no server to babysit, trivially cheap to host.
- **Design system, not ad-hoc CSS.** Everything references shared **design tokens**
  (color, type scale, spacing, radii, shadows) — no hard-coded values. Change a token,
  change the whole site consistently.
- **Reusable components.** Pages are composed from a small set of semantic, documented
  components (`Hero`, `Split`, `Band`, `SectionHeader`, `AccentList`, `PageIntro`,
  `Photo`…). New pages are assembled, not hand-built — which keeps them consistent by
  construction.
- **Content is data-driven.** Repeating content (links, quotes, events, the photo
  catalogue) lives in typed data files, separate from layout. Editing copy doesn't mean
  touching markup.
- **Performance & accessibility built in.** Responsive, optimized images through a
  single pipeline; portrait-first editorial photography of real moments, not stock.
- **It's documented.** `DESIGN.md` covers the visual language and every component;
  `CLAUDE.md` captures the content philosophy and guardrails. The "why" is written
  down, so future changes can stay coherent.

Environment-aware deploys (development / staging / production) are a one-line config
change, and the whole thing builds and previews locally in seconds.

---

## What we're asking of contributors

Three things keep the site coherent as it grows:

1. **Stay specific and human.** If a sentence could apply to any church, rewrite it.
2. **Use the system.** Reach for existing tokens and components before inventing new
   CSS. Consistency is a feature, not a constraint.
3. **Match the voice across sections.** Families, Youth, and Care should sound like the
   same place — because they are.

The result we're after: a website where the right person, on their first visit, thinks
_"these are my people"_ — and where the team can keep it that way without friction.
