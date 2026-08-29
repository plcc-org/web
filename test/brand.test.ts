import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { brand } from '../src/config/church'

// src/config/church.ts carries literal copies of two CSS tokens, because
// <meta name="theme-color"> and the web manifest can't read a custom property.
// Its comment used to say "nothing enforces that, so this comment is the
// enforcement" — this test is the enforcement now.

const tokens = readFileSync('src/styles/tokens.css', 'utf-8')

/** The value of a custom property in tokens.css, normalized to #rrggbb. */
function tokenHex(name: string): string {
  const raw = tokens.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim()
  if (!raw) return `(token ${name} not found)`
  const rgb = raw.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (rgb) {
    const [, r, g, b] = rgb
    return `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
  }
  return raw.toLowerCase()
}

describe('brand colours match tokens.css', () => {
  it('brand.theme is --color-moss', () => {
    expect(brand.theme.toLowerCase()).toBe(tokenHex('--color-moss'))
  })

  it('brand.background is --color-stone', () => {
    expect(brand.background.toLowerCase()).toBe(tokenHex('--color-stone'))
  })
})
