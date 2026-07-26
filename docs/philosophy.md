# Site Philosophy & Guardrails

Why this site exists and the principles that keep it coherent. Read this before
adding or restructuring pages. For how we _write_, see [voice.md](./voice.md); for how
it _looks_, see [design-system.md](./design-system.md).

---

## The shift: from broadcast to belonging

The old site was built on a **broadcast** model — _here's everything we do, come find
us._ This site is built on a **belonging** model — _here's what life here feels like,
and where you might fit._

That isn't cosmetic. Pages are in service of a single question a first-time visitor
is actually asking: **"Could this be a place for me and my family?"**

The primary audience is **people outside the church** — young families and first-time
guests — not the people already here. For insiders, we have other additional ways to connect, including the "In the Loop" newsletter, the Church Center site, and of course the service and announcements on Sundays; newcomers can't connect in those ways.
So we optimize for the newcomer, on purpose.

---

## The core idea: help people see themselves

We're helping **people recognize themselves** at Pine Lake specifically. That includes families, teens, older couples, single moms, people of a variety of background, ethnicity, or dress. Rather than "will you fit with us", we want a newcomer to see "you're not going to be the odd-one out here".

In addition, this gives us one ruthless test for any sentence:

> **If it could describe any church, it's too generic to keep.**

Concrete beats warm-and-vague every time.

---

## Site principles

These are the tenets that guide the content we add to the site. (Word-choice rules that
flow from them live in [voice.md](./voice.md).)

### 1. A welcoming site, not a persuasion site

As mentioned above, we want people to see themselves reflected in the visuals and content here. The content should be human, light on jargon, warm in temperature.

### 2. Avoid "program gravity" — the Doors model

Many church sites expose their structure by collapsing their information into a list of programs. But people come to the site to see what kind of church we are, not to read our org chart. And that means that a page on (say) receiving meals of care shouldn't also talk about how to volunteer for the program to _offer_ meals of care. A newcomer
doesn't search for "the Care Ministry" — they're having a hard week and wondering if
anyone would help.
**Pattern:** group content around **life sections and needs**, not programs or departments.

This is what we mean by the **Doors model**, the term [voice.md](./voice.md) uses for the
language side of the same idea. A door is an entry point named for **the situation a
person is in**, not for the department that runs it. "Need support right now?" is a door;
"Care Ministry" is a department. Every top-level section of the site should be openable
by someone describing their own life, without knowing a single one of our internal names.

The test: if a label would only make sense to someone who already attends, it's a
department, not a door.

### 3. Strategically incomplete

The site is a **high-signal front door**, not an exhaustive catalog of everything the
church does. Incompleteness is a strategic choice — a clear, confident site beats a
complete-but-cluttered one.

### 4. Photos as vignettes, not decoration

Photos are glimpses of real life, not stock imagery or posed portraits.

### 5. Implicit "no pressure"

Low pressure is communicated through **structure and clarity**, not by repeating "no
pressure" everywhere. **Rule:** use explicit reassurance only where there is real
perceived risk (e.g. care situations).

### 6. Protect "time" clarity

Narrative pages typically stay evergreen. **Rule:** anything that needs frequent updating belongs
in a dedicated module or component (What's On, which is fed from the church calendar —
see [events.md](./events.md)), never baked into narrative copy that quickly becomes stale.

### 7. Internal consistency

Different pages must "sound like the same place." Match tone, structure,
and pacing across sections — and use the shared design tokens and components so they
look like the same place too.

---

## Emotional sequencing

Pages are designed to move a visitor through a sequence, not to stand alone:

1. **Home** → _"I might belong here."_
2. **I'm New / Families** → _"I understand what this would feel like."_
3. **For Our Neighbors / Church Life** → _"I can engage at my own pace."_
4. **Plan a Visit** → _"I know exactly what happens if I turn up."_

---

## Information architecture

The site is a funnel of welcome, plus a parallel pathway for the wider community.

### Primary navigation

Eight items, in this order:

1. **I'm New** — the front door; answers the emotional and practical questions a guest has.
2. **About** — who we are, what we believe, leadership.
3. **Families** — kids, youth, and family life.
4. **For Our Neighbors** — how the church shows up _outside_ itself, organized by need.
5. **Church Life** — what shared life looks like _inside_, for people starting to make
   Pine Lake home.
6. **What's On** — the calendar (see [events.md](./events.md)).
7. **Messages** — the sermon archive.
8. **Plan a Visit** — the CTA pill, not a plain nav link.

The label in the nav, the `<title>` and the `<h1>` must agree. The page is called
**What's On** everywhere; "What's Happening" is an earlier name that shouldn't reappear.

### Why "Church Life" and "For Our Neighbors" are different things

This is the least obvious distinction in the IA, and the one most likely to get collapsed
by someone tidying up. The axis is **the direction of the relationship**, not the type of
activity:

|              | **For Our Neighbors**                                              | **Church Life**                                            |
| ------------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| Written for  | Anyone in Sammamish or Issaquah, whether or not they'd ever attend | Someone beginning to make Pine Lake home                   |
| Answers      | "How does this church show up in my community?"                    | "What does shared life here actually look like?"           |
| Organized by | Need — support, space to gather, ways to serve locally             | Rhythm — groups through the week, serving, global partners |
| Assumes      | Nothing                                                            | That you're considering belonging                          |

So a meal delivered to a neighbour in a hard week is **Neighbors**; a weekly small group
is **Church Life**. Both involve food and both involve people — the question is who the
page is written _for_.

They overlap at exactly one point, deliberately: Neighbors' "Looking for connection?"
door names some of the same gatherings Church Life describes, because someone outside the
church should be able to find them without first deciding to belong.

If you're ever unsure which page something belongs on, ask whether the reader has already
decided this might be their church. If they haven't, it's Neighbors.
