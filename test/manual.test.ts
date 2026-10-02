import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { MANUAL_SECTION_IDS, manualPath, rewriteManualHref } from '../src/lib/manual'

// The webmaster's manual (docs/manual/) links between its own pages as ./page.md. The
// post-build crawl checks those links once they're rewritten to site paths, but not the
// #anchor half, and only after a full build — so both halves are checked here, from the
// source. A broken anchor lands an editor at the top of the wrong page with no error.

const DIR = 'docs/manual'
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'))
const ids = new Set(files.map((f) => f.replace(/\.md$/, '')))

function split(file: string): { data: Record<string, unknown>; body: string } {
  const text = readFileSync(join(DIR, file), 'utf-8')
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${file}: no frontmatter`)
  return { data: parseYaml(match[1]) as Record<string, unknown>, body: match[2] }
}

// GitHub-style heading ids, as Astro generates them: lowercase, punctuation dropped,
// spaces to hyphens, repeats numbered.
function headingIds(body: string): Set<string> {
  const seen = new Map<string, number>()
  const out = new Set<string>()
  const withoutCode = body.replace(/```[\s\S]*?```/g, '')
  for (const [, text] of withoutCode.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const plain = text
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_]/g, '')
    const base = plain
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s/g, '-')
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    out.add(n ? `${base}-${n}` : base)
  }
  return out
}

// Inline links and images, skipping code spans and fenced blocks.
function links(body: string): string[] {
  const prose = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
  return [...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1])
}

describe('rewriteManualHref', () => {
  it('turns manual pages into /webmaster/ paths, keeping the anchor', () => {
    expect(rewriteManualHref('./add-a-page.md')).toBe('/webmaster/add-a-page/')
    expect(rewriteManualHref('blocks.md#rules-of-thumb')).toBe('/webmaster/blocks/#rules-of-thumb')
    expect(rewriteManualHref('./index.md')).toBe('/webmaster/')
  })

  it('base-prefixes site paths and images', () => {
    expect(rewriteManualHref('/visit/')).toBe('/visit/')
    expect(rewriteManualHref('/visit/', '/sub/')).toBe('/sub/visit/')
    expect(rewriteManualHref('/block-previews/Split.webp', '/sub/')).toBe('/sub/block-previews/Split.webp')
    expect(rewriteManualHref('./voice.md', '/sub/')).toBe('/sub/webmaster/voice/')
  })

  it('leaves external links, schemes and anchors alone', () => {
    for (const href of ['https://plcc.org/', 'mailto:office@plcc.org', 'tel:+14253928636', '#steps', '//cdn.example']) {
      expect(rewriteManualHref(href)).toBe(href)
    }
  })

  it('refuses links into the unpublished developer docs, and bare relative paths', () => {
    expect(() => rewriteManualHref('../cms.md')).toThrow(/outside docs\/manual/)
    expect(() => rewriteManualHref('../cms.md#gotchas')).toThrow(/outside docs\/manual/)
    expect(() => rewriteManualHref('photos/')).toThrow(/relative/)
  })

  it('maps the front page to the manual root', () => {
    expect(manualPath('index')).toBe('webmaster/')
    expect(manualPath('blocks')).toBe('webmaster/blocks/')
  })
})

describe('docs/manual', () => {
  const pages = files.map((file) => ({ file, ...split(file) }))

  it('has a front page', () => {
    expect(ids.has('index')).toBe(true)
  })

  it('gives every page a title, a section, an order and its own description', () => {
    for (const { file, data } of pages) {
      expect(typeof data.title, `${file}: title`).toBe('string')
      expect(MANUAL_SECTION_IDS, `${file}: section`).toContain(data.section)
      expect(typeof data.order, `${file}: order`).toBe('number')
      expect(typeof data.description, `${file}: description`).toBe('string')
    }
    const descriptions = pages.map((p) => p.data.description)
    expect(new Set(descriptions).size, 'descriptions must be unique (the crawl fails duplicates)').toBe(
      descriptions.length
    )
  })

  it('links only to pages and headings that exist', () => {
    const anchors = new Map(pages.map((p) => [p.file.replace(/\.md$/, ''), headingIds(p.body)]))
    const broken = pages.flatMap(({ file, body }) =>
      links(body).flatMap((href) => {
        const self = file.replace(/\.md$/, '')
        const local = href.match(/^(?:\.\/)?([a-z\d-]+)\.md(?:#(.+))?$/i)
        const [target, anchor] = local ? [local[1], local[2]] : href.startsWith('#') ? [self, href.slice(1)] : []
        if (!target) {
          try {
            rewriteManualHref(href)
            return []
          } catch (e) {
            return [`${file}: ${(e as Error).message}`]
          }
        }
        if (!ids.has(target)) return [`${file}: ${href} — no such page`]
        if (anchor && !anchors.get(target)?.has(anchor)) return [`${file}: ${href} — no such heading`]
        return []
      })
    )
    expect(broken).toEqual([])
  })
})
