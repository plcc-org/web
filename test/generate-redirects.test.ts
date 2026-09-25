import { describe, it, expect } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, existsSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// scripts/generate-redirects.mjs turns src/content/short-links into public/_redirects
// plus a generated 410 route per "gone" link. It runs before every build, including
// Cloudflare's, and it is the only check on the rules that need the whole list at
// once: duplicate addresses, and a short link that would hide a real page (Cloudflare
// answers _redirects before static assets, so that would take the page off the site
// with a green build). Each case runs the real script in a scratch directory.

const script = join(process.cwd(), 'scripts/generate-redirects.mjs')

type Files = Record<string, string>

function run(files: Files) {
  const dir = mkdtempSync(join(tmpdir(), 'plcc-redirects-'))
  mkdirSync(join(dir, 'src/content/short-links'), { recursive: true })
  mkdirSync(join(dir, 'src/pages'), { recursive: true })
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  try {
    const result = spawnSync(process.execPath, [script], {
      cwd: dir,
      env: { ...process.env, PUBLIC_TINA_CLIENT_ID: '' },
      encoding: 'utf-8',
    })
    const out = join(dir, 'public/_redirects')
    const pagesDir = join(dir, 'src/pages')
    const pages = readdirSync(pagesDir, { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => join(d.parentPath, d.name).slice(pagesDir.length + 1))
      .sort()
    return {
      ok: result.status === 0,
      output: `${result.stdout}${result.stderr}`,
      redirects: existsSync(out) ? readFileSync(out, 'utf-8') : '',
      pages,
      routes: Object.fromEntries(pages.map((p) => [p, readFileSync(join(pagesDir, p), 'utf-8')])),
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const link = (fields: Record<string, string | boolean>) =>
  Object.entries(fields)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`)
    .join('\n') + '\n'

const SL = 'src/content/short-links'

describe('generate-redirects', () => {
  it('writes a shortcut as a 302, with and without the trailing slash', () => {
    const r = run({
      [`${SL}/camp.yaml`]: link({ from: '/Camp', destination: 'https://example.org/camp', expires: '2099-01-01' }),
    })
    expect(r.ok).toBe(true)
    expect(r.redirects).toContain('/camp https://example.org/camp 302\n/camp/ https://example.org/camp 302')
    expect(r.redirects).toContain('# review by 2099-01-01')
  })

  it('writes a moved page as a 301', () => {
    const r = run({
      [`${SL}/old.yaml`]: link({ from: '/connect/about/', destination: '/about/', kind: 'moved', permanent: true }),
    })
    expect(r.ok).toBe(true)
    expect(r.redirects).toContain('/connect/about /about/ 301')
    expect(r.redirects).toContain('# permanent — no review date')
  })

  it('keeps only the date from a CMS timestamp in the review comment', () => {
    const r = run({
      [`${SL}/give.yaml`]: link({
        from: '/give',
        destination: 'https://example.org/give',
        expires: '2099-03-01T08:00:00.000Z',
      }),
    })
    expect(r.redirects).toContain('# review by 2099-03-01\n')
  })

  it('still redirects a link past its review date, and says so', () => {
    const r = run({ [`${SL}/old.yaml`]: link({ from: '/old', destination: '/visit/', expires: '2000-01-01' }) })
    expect(r.ok).toBe(true)
    expect(r.redirects).toContain('/old /visit/ 302')
    expect(r.output).toMatch(/\/old passed its review date/)
  })

  it('refuses two links with the same address, however they are written', () => {
    const r = run({
      [`${SL}/a.yaml`]: link({ from: '/camp', destination: '/a/', permanent: true }),
      [`${SL}/b.yaml`]: link({ from: '/CAMP/', destination: '/b/', permanent: true }),
    })
    expect(r.ok).toBe(false)
    expect(r.output).toMatch(/"camp" is already defined/)
  })

  it('refuses a link that would hide a CMS page', () => {
    const r = run({
      'src/content/pages/visit.mdx': '---\ntitle: Visit\n---\n',
      [`${SL}/visit.yaml`]: link({ from: '/visit', destination: 'https://example.org', permanent: true }),
    })
    expect(r.ok).toBe(false)
    expect(r.output).toMatch(/"\/visit" is a real page/)
  })

  it('refuses a link that would hide a hand-built route', () => {
    const r = run({
      'src/pages/links/index.astro': '---\n---\n',
      [`${SL}/links.yaml`]: link({ from: '/links', destination: 'https://example.org', permanent: true }),
    })
    expect(r.ok).toBe(false)
    expect(r.output).toMatch(/"\/links" is a real page/)
  })

  it('reports a per-entry rule with the file it came from', () => {
    const r = run({ [`${SL}/bad.yaml`]: link({ from: 'camp', destination: '/visit/', permanent: true }) })
    expect(r.ok).toBe(false)
    expect(r.output).toContain(`${SL}/bad.yaml: The old address must start with a slash`)
  })

  it('turns a gone link into a 410 route, not a redirect rule', () => {
    const r = run({
      [`${SL}/vbs.yaml`]: link({ from: '/vbs-2025', kind: 'gone', expires: '2099-01-01', note: 'Last year' }),
    })
    expect(r.ok).toBe(true)
    expect(r.redirects).not.toContain('vbs-2025')
    const route = r.routes['vbs-2025.ts']
    expect(route).toContain('@generated-gone-route')
    expect(route).toContain('new Response(null, { status: 410 })')
    expect(route).toContain('export const prerender = false')
  })

  it('removes a gone route whose link was deleted, and leaves real routes alone', () => {
    const r = run({
      'src/pages/stale.ts':
        '// @generated-gone-route — generated\nexport const GET = () => new Response(null, { status: 410 })\n',
      'src/pages/robots.txt.ts': 'export const GET = () => new Response("")\n',
    })
    expect(r.ok).toBe(true)
    expect(r.pages).toEqual(['robots.txt.ts'])
  })

  it('does not treat its own gone routes as real pages', () => {
    // Otherwise the second run would refuse the link that generated the route.
    const r = run({
      'src/pages/vbs-2025.ts': '// @generated-gone-route — generated\n',
      [`${SL}/vbs.yaml`]: link({ from: '/vbs-2025', kind: 'gone', permanent: true }),
    })
    expect(r.ok).toBe(true)
    expect(r.pages).toEqual(['vbs-2025.ts'])
  })
})
