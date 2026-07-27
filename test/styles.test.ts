import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { globSync } from 'node:fs'

// Pins the one-place rule for CSS: every rule the site ships lives under
// src/styles/, and no .astro file carries a <style> block of its own.
//
// This is a test rather than a convention because the failure mode is silent
// and asymmetric. Astro scopes a component's <style> by appending a
// [data-astro-cid-…] attribute to its selectors, which raises their specificity
// — so a scoped rule outranks the stylesheet regardless of import order, from a
// file that nothing in src/styles/ mentions. Someone reading components.css to
// work out why a card looks wrong has no way to discover the rule that beat it.
//
// A scoped block is also the more obvious thing to reach for: it's what Astro's
// own docs recommend, and it's right there in the file being edited. Left to
// convention this drifts back one component at a time, which is how the site
// ended up with two competing patterns before. See §2 of docs/design-system.md
// for the boundary and why it falls where it does.

const root = fileURLToPath(new URL('..', import.meta.url))

describe('stylesheet organisation', () => {
  it('no .astro file carries a <style> block', () => {
    const offenders = globSync('src/**/*.astro', { cwd: root })
      .filter((f) => /<style[\s>]/.test(readFileSync(new URL(f, new URL('..', import.meta.url)), 'utf-8')))
      .sort()

    expect(offenders, `move these rules into src/styles/ — see §2 of docs/design-system.md`).toEqual([])
  })

  it('no .css file uses :global(), which is Astro syntax the browser drops', () => {
    // :global() is only meaningful inside an .astro <style> block, where the
    // compiler strips it. In a plain stylesheet the browser doesn't recognise
    // the pseudo-class and discards the whole rule — the styling vanishes with
    // no error anywhere. Now that every rule lives in a .css file, a :global()
    // pasted across during a move is silent breakage, so it's worth its own
    // assertion rather than relying on the stylelint pseudo-class allowance.
    const offenders = globSync('src/styles/*.css', { cwd: root })
      .filter((f) => readFileSync(new URL(f, new URL('..', import.meta.url)), 'utf-8').includes(':global('))
      .sort()

    expect(offenders, ':global() does not work in a .css file — drop the wrapper').toEqual([])
  })
})
