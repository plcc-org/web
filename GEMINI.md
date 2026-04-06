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
3. **Next Steps / Neighbors:** "I can engage at my own pace."
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
1. **Children (Kids) page:** Split from Families.
2. **Next Steps:** Define clearly.
3. **For Our Neighbors:** Additional subpages.
4. **Stories & Calendar:** Expansion and refinement.

---

# Content Strategy & Voice

Our writing is designed to be **grounded, human, and understated**, stripping away "marketing fluff" to build genuine trust.

### 1. The "Situation-First" Pattern
Start with the reader's emotional or practical reality rather than the church's program.
- **Pattern:** Describe a human situation → Offer a specific way we show up.
- **Example:** *"When life is overwhelming, even simple tasks can feel heavy."* (Meals of Care) vs *"We have a meals ministry."*

### 2. The "Direct Answer" Pattern
Anticipate unspoken visitor anxieties and answer them with blunt honesty.
- **Pattern:** Direct question → Direct, reassuring answer.
- **Example:** *"Will I stand out or be put on the spot? No."* (Plan a Visit).

### 3. Concrete over Abstract
Use specific, sensory details to signal a real-world community rather than a corporate institution.
- **Pattern:** Use proper nouns and specific details over generalities.
- **Example:** *"Seahawks jerseys and jeans,"* or *"Students sit in the front three rows."*

### 4. Permission-Giving Language
Explicitly validate the choice to stay distant or just observe.
- **Pattern:** Affirm that observation is a valid form of participation.
- **Example:** *"Come as you are... feel free to simply listen, participate fully, or hang back and observe."*

### 5. Jargon Removal
Systematically replace "insider" terms with accessible, plain English equivalents.
- **Avoid:** "Ministry," "Fellowship," "Discipleship," "Plug in," "Get involved."
- **Prefer:** "Support," "Connection," "Learning to follow Jesus," "Be part of," "Find a place."

---

# Information Architecture (IA)

The site is structured around a **three-stage funnel**, plus a parallel “neighbors” pathway:

### Primary Navigation Intent
1. **I’m New:** Entry point for visitors; answers emotional + practical questions.
2. **Next Steps:** For people beginning to engage (still evolving).
3. **Community:** For those who call PLCC home; includes serving and groups (not giving-centered).

### Parallel Structure
- **For Our Neighbors:** Organized around **needs, not departments**, using the "Doors" concept (ways the church shows up).

---

# Asset Management & Astro Best Practices

To ensure high performance and visual quality, we follow these Astro 5 standards:

### 1. Image Storage & Optimization
- **Rule:** Prefer `src/assets/` over `public/`.
- **Reasoning:** Images in `src/assets/` are processed by Astro's built-in optimization (resizing, format conversion to WebP/AVIF).
- **Status:** We are migrating `public/images/` content to `src/assets/images/`.

### 2. The `<Image />` Component
- Always use the `Image` component from `astro:assets` for localized assets.
- Provide clear `alt` text and appropriate `widths`/`sizes` for responsive delivery.

### 3. "Vignette" Processing
- New vignettes should be added to `src/assets/vignettes/`.
- **Vignette Grid:** Use the `vignettes.ts` data file to manage imports and consumption in the `VignetteGrid` component.

---

# Status & Refinement Questions

**Current State:** The home page and core section structures are in place. The content direction is strong, but the site is still evolving visually (image usage, layout polish).

### Questions for Future Agents:
- **Asset Lifecycle:** Is there a specific holding pen for raw photos before they are processed into vignettes? (Currently `public/images/`).
- **Next Steps Definition:** What specific "steps" (forms, events, contacts) should be prioritized for this page?
- **Data Schemas:** Should we establish explicit TypeScript Interfaces for `Event` or `Door` data?
- **Deployment:** Confirm if `.github/workflows/deploy.yml` is fully automated on merge to `main`.

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
