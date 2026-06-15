# Pine Lake Covenant Church Website

A photo-rich, editorial website for Pine Lake Covenant Church (PLCC), optimized for young
families and first-time guests. Built with Astro 6 + TypeScript, statically generated.

This file is the thin entry point. The full reference lives in **[`docs/`](./docs/)** —
read the doc that matches your change before editing.

## Documentation map

- **[docs/philosophy.md](./docs/philosophy.md)** — why the site exists and the guardrails
  for what belongs on it. Read before adding or restructuring pages.
- **[docs/voice.md](./docs/voice.md)** — tone and word choices. Read before writing copy.
- **[docs/design-system.md](./docs/design-system.md)** — visual language, design tokens,
  layout, components. Read before any visual change.
- **[docs/development.md](./docs/development.md)** — stack, project structure, build/run,
  conventions, the image system, CI.
- **[docs/infrastructure.md](./docs/infrastructure.md)** — environments, deployment,
  container workflows.
- **[docs/website-one-pager.md](./docs/website-one-pager.md)** — a shareable stakeholder
  brief.

## Non-negotiables

Even if you don't open the docs, never violate these:

- **The filter test.** If a sentence could describe any church, rewrite it with a
  specific, human signal. The site is a filter, not a persuasion site.
  → [philosophy.md](./docs/philosophy.md), [voice.md](./docs/voice.md)
- **No churchy jargon.** Avoid "fellowship," "discipleship," "ministry," "outreach,"
  "plug in." Belief-neutral but not diluted. → [voice.md](./docs/voice.md)
- **Tokens first.** Reference `var(--color-…)`, `var(--text-…)`, `var(--space-…)`. Never
  hard-code colors, sizes, radii, or shadows. → [design-system.md](./docs/design-system.md)
- **Portrait-first photos**, rendered through `<Photo>` and catalogued in
  `src/data/homePageImages.ts`. Avoid landscape crops. → [development.md](./docs/development.md)
- **Internal links use the base path:** ``href={`${import.meta.env.BASE_URL}about/`}``.
  → [development.md](./docs/development.md)
- **Data-driven content.** Repeating items live in `src/data/` and are mapped over — don't
  hand-author lists in markup. → [development.md](./docs/development.md)
- **Run `npm run format` before committing.** CI runs `format:check` and `check`.
  → [development.md](./docs/development.md)
