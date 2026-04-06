# Pine Lake Covenant Church Website Prototype

This project is a fast-iteration prototype for the Pine Lake Covenant Church (PLCC) website, designed with a photo-rich, editorial visual style. It is optimized for young families and first-time guests, focusing on clear information architecture and a welcoming aesthetic.

Here’s a comprehensive handoff that another agent could pick up without any prior context.

---

# Pine Lake Covenant Church Website — Project Summary

## 1. Core Goal (Content-First Framing)

This project is a **ground-up redesign of a church website**, with a strong emphasis on:

* **Clarity over completeness**
* **People over programs**
* **Invitation over information**
* **Belonging over broadcasting**

The site is not intended to be a comprehensive catalog of everything the church does. Instead, it aims to answer a smaller set of high-value questions:

* *Will I belong here?*
* *What is this church like?*
* *Can this community support me / my family?*
* *How do I take a next step?*

The tone throughout is intentionally:

* Non-pressuring
* Non-“churchy”
* Warm, but not verbose
* Specific, but not overwhelming

A key philosophical shift from typical church websites:

> Move from “here’s what we do” → to “here’s how you can find a place here”

---

## 2. Information Architecture (IA)

The site is structured around a **three-stage funnel**, plus a parallel “neighbors” pathway:

### Primary navigation intent

1. **I’m New**

   * Entry point for visitors
   * Sets expectations
   * Answers emotional + practical questions

2. **Next Steps**

   * For people beginning to engage
   * (Still evolving)

3. **Community (working name)**

   * For people who call Pine Lake home
   * Includes: serving, giving, groups, etc.
   * Intentionally *not* centered on giving

### Parallel structure:

4. **For Our Neighbors**

   * A major reframing of “ministries”
   * Organized around **needs, not church departments**
   * Built around the concept of **“doors”** (ways the church engages with the wider community)

This is one of the most important conceptual shifts in the project.

---

## 3. Key Content Patterns Established

Across pages, several consistent patterns have emerged:

### A. Start with the person’s situation

Not:

> “We offer a Meals Ministry”

But:

> “When life is overwhelming, even simple tasks can feel heavy…”

### B. Remove insider language

Avoid:

* “ministry”
* “plug in”
* “get involved”

Prefer:

* “find support”
* “connect”
* “be part of”

### C. De-emphasize pressure

Earlier drafts overused “no pressure.”
Now:

* The tone implies safety without repeating it

### D. Time-bound clarity

Where relevant:

* Support is described as **finite and appropriate**, not open-ended obligation

### E. Show, don’t tell

* Stories and quotes are used heavily
* Avoid declarative claims like “we are welcoming”

---

## 4. Home Page — Current State

**Goal:** Immediate emotional resonance + visual storytelling

**Key elements:**

* Reduced text density
* Photo-driven (with vignette-style imagery)
* Stories/quotes section:

  * Real attendee quotes now included
  * Placeholders still present for expansion
  * Photos intentionally *not paired 1:1* with quotes

**Status:**

* Structurally in place
* Content direction strong
* Still evolving visually (image usage, layout polish)

---

## Project Overview

- **Framework:** [Astro 5](https://astro.build/)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (located in `src/styles/global.css`)
- **Architecture:** Static Site Generation (SSG)
- **Deployment:** GitHub Pages (hosted at `https://timsneath.github.io/plcc-web/`)

## Building and Running

### Development
To start the local development server with Hot Module Replacement (HMR):
```bash
npm install
npm run dev
```
The site will typically be available at `http://localhost:4321/plcc-web/`.

### Production
To build the site for production:
```bash
npm run build
```
The output will be in the `dist/` directory.

### Formatting
To format the codebase using Prettier:
```bash
npm run format
```

## Project Structure

- `src/pages/`: Standard Astro file-based routing. Includes top-level pages and sub-directories for `about/` and `for-our-neighbors/`.
- `src/layouts/`: Contains `BaseLayout.astro`, which provides the core HTML structure, navigation, and footer.
- `src/components/`: Reusable UI components such as `VignetteGrid.astro`, `QuoteGrid.astro`, and `DoorCard.astro`.
- `src/data/`: Static data files (`.ts`) that drive various sections of the site (e.g., `events.ts`, `quotes.ts`, `vignettes.ts`).
- `src/assets/`: Local images and vignettes used throughout the site.
- `src/styles/`: Contains `global.css`, which houses the project's design tokens and component styles.
- `public/`: Static assets like `favicon.svg`, `robots.txt`, and larger web-ready images.

## Development Conventions

- **Internal Linking:** Always use `${import.meta.env.BASE_URL}` prefix for internal links and assets to ensure they resolve correctly on GitHub Pages (e.g., `<a href={`${import.meta.env.BASE_URL}about/`}>`).
- **Styling:** Prefer Vanilla CSS within `global.css` or Astro component `<style>` tags. Avoid adding heavy CSS frameworks.
- **Data-Driven Content:** For sections with repetitive items (like the "Vignette Grid" or "Quotes"), define the data in `src/data/` and map over it in the relevant component or page.
- **Accessibility:** Maintain existing accessibility features such as the "Skip to content" link and appropriate ARIA labels on grids and interactive elements.
- **Images:** Use the Astro `<Image />` component for optimized asset delivery.
