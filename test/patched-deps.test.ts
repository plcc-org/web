import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'

// Each patch in patches/ lands on one installed copy of its package. patch-package
// patches the top-level `node_modules/<name>` only, so a second copy nested under some
// other package is left stock — and nothing fails. That happened on the tinacms 3.13.0
// bump: @tinacms/cli's caret range reached a newer @tinacms/app, which brought its own
// tinacms 3.14.0, and since the app is what serves the editor, the block-editing patch
// silently stopped applying while the build stayed green.
//
// So, from the lockfile (what `npm ci` installs in CI and on Cloudflare): every patched
// package is installed exactly once, at the version its patch file names.

type Lock = { packages: Record<string, { version?: string }> }

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf-8')) as Lock

// patch-package names files `<name>+<version>.patch`, with a scope's slash written as
// `+` too: `@tinacms+cli+2.7.0.patch`.
const patches = readdirSync(new URL('../patches/', import.meta.url))
  .filter((file) => file.endsWith('.patch'))
  .map((file) => {
    const parts = file.replace(/\.patch$/, '').split('+')
    const version = parts.pop() as string
    return { file, name: parts.join('/'), version }
  })

describe('patched dependencies', () => {
  it('has patches to check', () => {
    expect(patches.length).toBeGreaterThan(0)
  })

  for (const { file, name, version } of patches) {
    it(`${name} is installed once, at ${version} (${file})`, () => {
      const copies = Object.entries(lock.packages)
        .filter(([path]) => path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`))
        .map(([path, entry]) => `${path}@${entry.version}`)
      expect(copies).toEqual([`node_modules/${name}@${version}`])
    })
  }
})
