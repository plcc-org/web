# Pine Lake Covenant Church Website Prototype

This project is a fast-iteration prototype for the Pine Lake Covenant Church (PLCC) website, designed with a photo-rich, editorial visual style. It is optimized for young families and first-time guests, focusing on clear information architecture and a welcoming aesthetic.

---

# Core Philosophy & Guardrails

This site is a **ground-up redesign**, shifting from a "broadcast" model to a "belonging" model. Future contributors must adhere to these tenets to maintain the project's integrity.

## 1. A Filtering Site, Not a Persuasion Site

We are not trying to convince everyone; we are helping the **right people recognize themselves**.

- **Guardrail:** If a sentence could apply to any church, it is too generic. Use specific, human signals (e.g., "Dinner at 6pm", "Students sit in the front three rows").

## 2. Avoid "Program Gravity"

Resist the urge to collapse into a list of programs.

- **Pattern:** Group content around **life situations**, not church departments or offerings. Avoid "Other things we offer" sections.

## 3. Intentional Asymmetry

The site is not evenly structured by design.

- **Rule:** Don't "balance" the site for symmetry. Only add pages when there is real content and a clear user need. Quality and readiness trump theoretical completeness.

## 4. Tone: Grounded, Human, Understated

Aim for a tone that is **warm, but not soft**.

- **Avoid "Too Soft":** "We would love to invite you on a journey..."
- **Avoid "Too Hard":** Overly transactional or instructional language.
- **Avoid "Churchy":** "Fellowship," "discipleship," "plug in."
- **Aim for:** Grounded, human, and slightly understated language.

## 5. Implicit "No Pressure"

Low pressure is communicated through **structure and clarity**, not by repeating "no pressure" everywhere.

- **Rule:** Use explicit reassurance only where there is real perceived risk (e.g., care situations).

## 6. Protect "Time" Clarity

Narrative pages should stay evergreen.

- **Rule:** If something requires frequent updating, it belongs in a specific module or component, e.g. the Calendar page, not embedded in narrative copy.

## 7. Photos as Vignettes, Not Decoration

- **Philosophy:** Photos are glimpses of real life, not stock imagery or posed portraits.
- **Constraint:** Photos are **not mapped 1:1** to stories to avoid tokenism and "forced" representation.

## 8. The "Doors" Model

A worldview shift from "What we do" to **"How we show up in people's lives."**

- **Terminology:** Avoid churchy jargon or in/out language in navigation. Don't make assumptions about people's theology, but equally don't shy from being distinctive and calling out unique values.
- **Avoid:** "Ministry," "Fellowship," "Discipleship,", "Outreach"
- **Prefer:** "Support," "Connection," "Learning to follow Jesus," "Be part of," "Find a place.

## 9. Emotional Sequencing

Pages work in a specific order:

1. **Home:** "I might belong here."
2. **I’m New / Families / Youth:** "I understand what this would feel like."
3. **For Our Neighbors / Next Steps:** "I can engage at my own pace."

- **Implication:** Don't optimize pages in isolation; consider the user's emotional state upon arrival.

## 10. Strategically Incomplete

The site is a **high-signal front door**, not an exhaustive catalog of everything that might go on in the church. Incompleteness is a strategic choice.

## 11. Belief-Neutral (but not Diluted) Language

- Don't assume the reader is Christian or familiar with church.
- Don't require agreement to belong.
- Don't hide faith language or dilute conviction.

## 12. Internal Consistency

Families, Youth, and Care pages must "sound like the same place." Match tone, structure, and pacing across all sections. Design should also be consistent, with shared tokens and language.

## 13. "Situation-First", Low-Key Language

Start with the reader's emotional or practical reality rather than the church's program.

- **Pattern:** Describe a human situation → Offer a specific way we show up.
- **Example:** _"When life is overwhelming, even simple tasks can feel heavy."_ (Meals of Care) vs _"We have a meals ministry."_

---

# Content Strategy & Voice

Our writing is designed to be **grounded, human, and understated**, stripping away "marketing fluff" to build genuine trust.

---

# Information Architecture (IA)

The site is structured around a **three-stage funnel**, plus a parallel “neighbors” pathway:

### Primary Navigation Intent

1. **I’m New:** Entry point for visitors; answers emotional + practical questions.
2. **About:** Who we are, beliefs, leadership, ethos.
3. **Families:** Kids, youth, and family life.
4. **For Our Neighbors:** Needs-based "Doors" — how the church shows up in the community.
5. **What's Happening / Messages:** Current events and sermon archive.

> **Note:** "Next Steps" has been removed from the primary navigation while its content is still being defined. The page exists at `/next-steps/` but is not linked from the header.

### Parallel Structure

- **For Our Neighbors:** Organized around **needs, not departments**, using the "Doors" concept (ways the church shows up).

---

# Technical Project Overview

- **Framework:** [Astro 5](https://astro.build/)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (`src/styles/global.css`)
- **Architecture:** Static Site Generation (SSG)
- **Deployment:** GitHub Pages (`https://timsneath.github.io/plcc-web/`)

## Building and Running

```bash
npm install
npm run dev    # Local development at http://localhost:4321/plcc-web/
npm run build  # Production build to dist/
npm run format # Prettier formatting
```

## Development Conventions

- **Internal Linking:** Use `${import.meta.env.BASE_URL}` prefix (e.g., `<a href={`${import.meta.env.BASE_URL}about/`}>`).
- **Data-Driven:** Define repetitive items in `src/data/` and map over them.
- **Images:** Use the Astro `<Image />` component for optimization.
