import { describe, it, expect } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The media pipeline is one contract spread across four files that nothing
// compiles together: what the picker accepts (tina/config.ts), what the globs
// resolve (src/lib/images.ts), what the guard tests can see
// (test/image-ref.test.ts), and what the dev server serves (astro.config.mjs).
// They have drifted before — `media.accept` allowed AVIF while the guard regex
// matched only jpg/jpeg/png/webp, so an AVIF ref was invisible to the tests
// whose whole job is catching bad refs. This pins the four to each other.
describe('every accepted upload format flows through the whole pipeline', () => {
  const MIME_EXTENSIONS: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/avif': ['avif'],
  }

  const configSource = readFileSync('tina/config.ts', 'utf-8')
  const acceptMatch = configSource.match(/accept:\s*\[([^\]]*)\]/)
  const accepted = [...(acceptMatch?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1])

  it('reads the accept list at all', () => {
    expect(accepted.length).toBeGreaterThan(0)
  })

  it('knows an extension for every accepted MIME type', () => {
    for (const mime of accepted) expect(MIME_EXTENSIONS[mime], mime).toBeDefined()
  })

  const extensions = accepted.flatMap((mime) => MIME_EXTENSIONS[mime] ?? [])

  it('the image registry globs resolve every accepted format', () => {
    const globs = [...readFileSync('src/lib/images.ts', 'utf-8').matchAll(/\*\.\{([^}]+)\}/g)]
    expect(globs.length).toBeGreaterThan(0)
    for (const [, list] of globs) {
      for (const ext of extensions) expect(list.split(','), ext).toContain(ext)
    }
  })

  it('the guard regex sees every accepted format', () => {
    const guard = readFileSync('test/image-ref.test.ts', 'utf-8').match(/IMAGE_REF = .*\(\?:([a-z|]+)\)/)
    expect(guard).not.toBeNull()
    for (const ext of extensions) expect(guard![1].split('|'), ext).toContain(ext)
  })

  it('the dev media route serves every accepted format', () => {
    const types = readFileSync('astro.config.mjs', 'utf-8').match(/const TYPES = \{([^}]+)\}/)
    expect(types).not.toBeNull()
    for (const ext of extensions) expect(types![1], ext).toContain(`'.${ext}'`)
  })
})

// The deployed admin depends on /assets/images/* redirecting to TinaCloud's CDN
// (field thumbnails for refs the cloud resolver leaves un-rewritten, and the
// /tina-island preview's unoptimised fallback). CI builds have no credentials,
// so the real build can't assert the rule — this runs the generator directly,
// in a scratch directory, with and without the client ID.
describe('generate-redirects emits the CMS media rule', () => {
  const script = join(process.cwd(), 'scripts/generate-redirects.mjs')

  const run = (env: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'plcc-redirects-'))
    mkdirSync(join(dir, 'src/content/short-links'), { recursive: true })
    mkdirSync(join(dir, 'src/pages'), { recursive: true })
    try {
      execFileSync(process.execPath, [script], { cwd: dir, env: { ...process.env, PUBLIC_TINA_CLIENT_ID: '', ...env } })
      const out = join(dir, 'public/_redirects')
      return existsSync(out) ? readFileSync(out, 'utf-8') : ''
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it('with a client ID, redirects /assets/images/* to that project on the CDN', () => {
    const redirects = run({ PUBLIC_TINA_CLIENT_ID: 'test-client-id' })
    expect(redirects).toContain('/assets/images/* https://assets.tina.io/test-client-id/:splat 302')
  })

  it('without one there is no rule — CI and fresh clones have no deployed admin', () => {
    expect(run({})).not.toContain('/assets/images/')
  })
})
