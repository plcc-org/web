# Pine Lake Covenant Church — Documentation

The reference behind the PLCC website, in two parts for two readers. Keep both current;
when a doc and the code disagree, fix whichever is wrong.

## For editors: the webmaster's manual

**[`manual/`](./manual/index.md)**, published on the site at **`/webmaster/`** (noindex, not
in the nav). Short recipes for the jobs editors do in the CMS (change some words, add a
page, prepare Sunday’s links, post a closure notice), plus the thinking every contributor
needs:

- **[Why the site is the way it is](./manual/why.md)**: the purpose, the audience, the
  information architecture, and what belongs on the site. Read before adding or
  restructuring pages.
- **[How we write](./manual/voice.md)**: tone and word choices. Read before writing copy.
- **[Which block do I use?](./manual/blocks.md)**: what a block is, and how to choose one.
- **[Block gallery](./manual/block-gallery.md)**: every block in the CMS palette, with a preview.

The CMS's field help links into these pages by address (`guide()` in `tina/templates.mjs`),
so a manual file's name is its URL. Don't rename one without updating those links.

## For developers

| Doc                                          | Open it when you're…                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| **[development.md](./development.md)**       | working in the codebase — build, conventions, images, tests    |
| **[design-system.md](./design-system.md)**   | making visual changes — tokens, layout, components             |
| **[cms.md](./cms.md)**                       | changing the editor — collections, blocks, `tina/config.ts`    |
| **[events.md](./events.md)**                 | touching "What's On" — the Planning Center calendar pipeline   |
| **[infrastructure.md](./infrastructure.md)** | deploying, configuring environments, or running in a container |

The two ideas that govern everything: the site is a **filter, not a persuasion site** (if a
sentence could describe any church, rewrite it), and it's built on **belonging, not
broadcast**. Both are unpacked in [Why the site is the way it is](./manual/why.md).

For the project's front page and quick start, see the repo [README.md](../README.md). The
thin agent-facing rule sheet is [CLAUDE.md](../CLAUDE.md), which points back here.
