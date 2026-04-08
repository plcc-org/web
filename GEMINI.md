# Pine Lake Covenant Church Website Prototype

This project is a fast-iteration prototype for the Pine Lake Covenant Church (PLCC) website, designed with a photo-rich, editorial visual style. It is optimized for young families and first-time guests, focusing on clear information architecture and a welcoming aesthetic.

---

# Core Philosophy & Guardrails

This site is a **ground-up redesign**, shifting from a "broadcast" model to a "belonging" model. Future contributors must adhere to these 13 tenets to maintain the project's integrity.

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

- **Rule:** If something requires frequent updating, it belongs in the **Calendar** page, not embedded in narrative copy.

## 7. Photos as Vignettes, Not Decoration

- **Philosophy:** Photos are glimpses of real life, not stock imagery or posed portraits.
- **Constraint:** Photos are **not mapped 1:1** to stories to avoid tokenism and "forced" representation.

## 8. The "Doors" Model

A worldview shift from "What we do" to **"How we show up in people's lives."**

- **Terminology:** Avoid "Outreach," "Ministries," or "Programs" in navigation. Use needs-based "Doors."

## 9. Emotional Sequencing

Pages work in a specific order:

1. **Home:** "I might belong here."
2. **I’m New / Families / Youth:** "I understand what this would feel like."
3. **For Our Neighbors / Next Steps:** "I can engage at my own pace."

- **Implication:** Don't optimize pages in isolation; consider the user's emotional state upon arrival.

## 10. Strategically Incomplete

The site is a **high-signal front door**, not a mirror of the existing site or an exhaustive catalog. Incompleteness is a strategic choice.

## 11. Belief-Neutral (but not Diluted) Language

- Don't assume the reader is Christian or familiar with church.
- Don't require agreement to belong.
- Don't hide faith language or dilute conviction.

## 12. Internal Consistency

Families, Youth, and Care pages must "sound like the same place." Match tone, structure, and pacing across all sections.

## 13. Current Content Gaps (Priority Order)

1. **Next Steps:** Define clearly — what specific steps, forms, or events are prioritized?
2. **For Our Neighbors:** Additional subpages beyond Meals of Care, Stephen Ministry, Weddings & Memorials.
3. **Stories & Calendar:** Expansion and refinement.
4. **Youth page:** Needs same panel/MomentsSection treatment as Families and Plan a Visit.

---

# Content Strategy & Voice

Our writing is designed to be **grounded, human, and understated**, stripping away "marketing fluff" to build genuine trust.

### 1. The "Situation-First" Pattern

Start with the reader's emotional or practical reality rather than the church's program.

- **Pattern:** Describe a human situation → Offer a specific way we show up.
- **Example:** _"When life is overwhelming, even simple tasks can feel heavy."_ (Meals of Care) vs _"We have a meals ministry."_

### 2. The "Direct Answer" Pattern

Anticipate unspoken visitor anxieties and answer them with blunt honesty.

- **Pattern:** Direct question → Direct, reassuring answer.
- **Example:** _"Will I stand out or be put on the spot? No."_ (Plan a Visit).

### 3. Concrete over Abstract

Use specific, sensory details to signal a real-world community rather than a corporate institution.

- **Pattern:** Use proper nouns and specific details over generalities.
- **Example:** _"Seahawks jerseys and jeans,"_ or _"Students sit in the front three rows."_

### 4. Permission-Giving Language

Explicitly validate the choice to stay distant or just observe.

- **Pattern:** Affirm that observation is a valid form of participation.
- **Example:** _"Come as you are... feel free to simply listen, participate fully, or hang back and observe."_

### 5. Jargon Removal

Systematically replace "insider" terms with accessible, plain English equivalents.

- **Avoid:** "Ministry," "Fellowship," "Discipleship," "Plug in," "Get involved."
- **Prefer:** "Support," "Connection," "Learning to follow Jesus," "Be part of," "Find a place."

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

# Asset Management & Astro Best Practices

To ensure high performance and visual quality, we follow these Astro 5 standards:

### 1. Image Storage

- **Community/event photos:** Stored in `public/images/` and registered in `src/data/homePageImages.ts`.
  - Each entry has `filename`, `tags[]`, and optional `alt`.
  - Helper functions: `imagePublicSrc()`, `imageAlt()`, `imageByFilename()`.
  - Tags include: `worship`, `kids`, `family`, `community`, `service`, `social`, `gathering`, `care`, `generosity`, `youth`, `prayer`.
- **Optimized/processed assets** (used with the `<Image />` component): Stored in `src/assets/images/`.
- **Logo:** `public/images/plcc-logo-icon.jpg`

### 2. The `<Image />` Component

- Use the `Image` component from `astro:assets` for assets in `src/assets/images/`.
- Provide clear `alt` text and appropriate `widths`/`sizes` for responsive delivery.
- For `public/images/` photos, use `imagePublicSrc()` helper with a standard `<img>` tag.

### 3. The `MomentsSection` Component

`src/components/MomentsSection.astro` — reusable 3-column portrait photo grid.

```typescript
type Props = {
  heading?: string | null  // null = no heading rendered; default = 'Moments from Pine Lake'
  items: MomentsItem[]     // array of { image, fallbackAlt }
  sectionClass?: string    // default = 'section'
}
```

- Grid: 3 cols desktop, 2 cols mobile (≤768px), portrait `ratio-4x5` tiles.
- Used on: Home, I'm New, Plan a Visit, For Our Neighbors, Families.

# Design System

All design tokens are defined in `src/styles/global.css` under `:root`.

### Key Tokens

| Token | Value | Usage |
|---|---|---|
| `--color-moss` | `#6a9529` | Primary green, CTAs |
| `--color-forest` | `#1a2e0c` | Dark text, headings |
| `--color-stone` | `#f2ede6` | Background tones |
| `--color-mist` | `#ddd6c8` | Borders, subtle dividers |
| `--color-clay` | `#8b5e3c` | Accent, pull-quotes |
| `--measure` | `65ch` | Max readable line length |
| `--radius-soft` | `16px` | Card/panel corner radius |
| `--shadow-diffuse` | — | Soft page-level shadow |
| `--shadow-panel` | `0 12px 32px -20px rgba(26,46,12,0.35)` | Card/panel shadow |
| `--surface-gradient-soft` | `linear-gradient(170deg, white→stone)` | Card background gradient |

### Key Utility Classes

- `.surface-gradient-soft` — applies `--surface-gradient-soft` background
- `.text-body-large` — `font-size: 1.25rem; line-height: 1.7` for lede/intro text
- `.logo-circle` — `border-radius: 50%; object-fit: cover` for circular image crops
- `.page--wide` — removes `max-width` constraint for full-width layouts

### Page Layout Pattern

Narrow reading pages use `class="page"` (max-width: `--measure`).
Wide pages use `class="page page--wide"` with a scoped prose class (e.g., `.plan-visit__prose { max-width: var(--measure); }`) applied only to text sections, leaving photo sections full-width.

### Card/Panel Pattern

Content panels on section pages (Families, Plan a Visit, etc.) use:
```html
<section class="section [page]__prose [page]__panel surface-gradient-soft">
```
With scoped CSS:
```css
.[page]__panel {
  padding: clamp(1.25rem, 2.4vw, 2rem);
  border-radius: var(--radius-soft);
  border: 1px solid var(--color-mist);
  box-shadow: var(--shadow-panel);
}
```

---

# Status & Refinement Questions

**Current State:** Core pages are built and styled. The design system is stable with reusable tokens and the `MomentsSection` photo component. Navigation is settled (Next Steps temporarily removed). Content is strong; remaining work is mostly filling gaps and adding real photos to pages that still use placeholders.

### Open Questions for Future Agents:

- **Next Steps Definition:** What specific steps, forms, or events should be prioritized for this page?
- **Data Schemas:** Should we establish explicit TypeScript interfaces for `Event` or `Door` data?
- **Deployment:** Confirm if `.github/workflows/deploy.yml` is fully automated on merge to `main`.
- **Image tagging:** Several `public/images/` entries have generic `community` tags — consider refining.

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
