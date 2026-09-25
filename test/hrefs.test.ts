import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Internal links go through withBase()/resolveHref() (src/lib/url.ts) so the site
// still works when served under a sub-path. A literal root-relative href or src
// in a component works on every current environment and breaks on the first one
// that isn't served from '/', so it's caught here rather than then.

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? files(join(dir, d.name)) : d.name.endsWith('.astro') ? [join(dir, d.name)] : []
  )

// href="/…", href={'/…'}, href={`/…`} (and src/action) — but not protocol-relative "//…".
const ROOT_RELATIVE = /\b(?:href|src|action)=(?:"|\{\s*['"`])\/(?!\/)/g

describe('internal links', () => {
  it('are never written as root-relative literals in components', () => {
    const offenders = files('src').flatMap((file) =>
      readFileSync(file, 'utf-8')
        .split('\n')
        .flatMap((line, i) => (line.match(ROOT_RELATIVE) ? [`${file}:${i + 1}: ${line.trim()}`] : []))
    )
    expect(offenders, 'use withBase() from src/lib/url.ts').toEqual([])
  })

  it('recognises the patterns it forbids', () => {
    for (const bad of ['<a href="/visit/">', "<a href={'/visit/'}>", '<a href={`/visit/`}>', '<img src="/logo.png">']) {
      expect(bad.match(ROOT_RELATIVE), bad).not.toBeNull()
    }
    for (const ok of [
      '<a href={withBase("visit/")}>',
      '<a href="https://x.org/">',
      '<img src="//cdn.x/y.png">',
      '<a href="#top">',
    ]) {
      expect(ok.match(ROOT_RELATIVE), ok).toBeNull()
    }
  })
})
