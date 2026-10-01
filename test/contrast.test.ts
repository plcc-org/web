import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Asserts the accent tokens still clear WCAG AA against the surfaces they're
// actually painted on.
//
// The values are read out of tokens.css rather than restated here, so this
// tests the shipped colours and not a copy of them. That matters more than it
// looks: the contrast of an accent depends on the *surface*, so deepening
// `--color-sand` (a purely visual decision, made to strengthen the band
// transition) silently eats into the margin of every accent laid on it. That
// coupling is invisible at the point of the edit, which is exactly the kind of
// thing worth pinning to a test rather than to anyone's memory.
//
// AA is 4.5:1 for body text. The site has large-text cases that would only need
// 3:1, but they aren't separated out — a single threshold is easier to hold and
// leaves no judgement call about which side of 18.66px a given label falls on.

const AA_NORMAL_TEXT = 4.5

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf-8')
const themes = readFileSync(new URL('../src/styles/themes.css', import.meta.url), 'utf-8')

type RGB = [number, number, number]

function find(css: string, name: string): RGB | undefined {
  const m = css.match(new RegExp(`--${name}:\\s*rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)`))
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  const hex = css.match(new RegExp(`--${name}:\\s*#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})\\b`, 'i'))
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)]
}

function token(name: string): RGB {
  const value = find(tokens, name)
  if (value) return value
  throw new Error(`--${name} is not defined in tokens.css as an rgb() triple or #rrggbb`)
}

// A hidden theme experiment (themes.css) is shown to real people on the live
// site, so it's held to the same floor. Its block only restates what it changes;
// anything it leaves alone resolves from tokens.css, as it does in the browser.
function themed(theme: string): (name: string) => RGB {
  const block = themes.match(new RegExp(`:root\\[data-theme~='${theme}'\\]\\s*\\{([^}]*)\\}`))
  if (!block) throw new Error(`themes.css has no :root[data-theme~='${theme}'] block`)
  return (name) => find(block[1], name) ?? token(name)
}

const WHITE: RGB = [255, 255, 255]

/** Relative luminance, per WCAG 2.x. */
function luminance([r, g, b]: RGB): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Every opaque light surface the site puts accent text on. `sand` is the one
// that binds — it's the darkest, and it's the default tone for Band, Split,
// QuoteCarousel and PageHero, so it's where most eyebrows and subheads land.
const LIGHT_SURFACES = ['color-sand', 'color-stone', 'color-paper'] as const

function accentTextMeetsAA(token: (name: string) => RGB) {
  for (const ink of ['color-moss-ink', 'color-clay-ink'] as const) {
    for (const surface of LIGHT_SURFACES) {
      it(`--${ink} on --${surface}`, () => {
        expect(contrast(token(ink), token(surface))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
      })
    }
  }

  // The inks double as fills under white text (.btn, .skip-link,
  // the Roadmap step markers) — the same pair inverted, so it needs the same
  // floor. Stylelint can't see a fill/text pairing, so it's checked here.
  for (const ink of ['color-moss-ink', 'color-clay-ink'] as const) {
    it(`white text on a --${ink} fill`, () => {
      expect(contrast(WHITE, token(ink))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })
  }

  // Eyebrows on a forest band or split (layout.css). `--gradient-forest` is
  // translucent over the stone page, so the surface is a composite: its 60% stop
  // is forest-2 at 0.92. Centered text sits mid-band, darker than that stop, so
  // the stop is the floor. (The far 100% corner fails for every ink, white
  // headings included — nothing is laid out there.)
  it('--color-moss-light on the forest gradient', () => {
    const over = (fg: number[], alpha: number, bg: number[]) => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha)) as RGB
    const surface = over(token('color-forest-2'), 0.92, token('color-stone'))
    expect(contrast(token('color-moss-light'), surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })
}

describe('accent text meets WCAG AA', () => accentTextMeetsAA(token))

for (const theme of ['slate']) {
  describe(`accent text meets WCAG AA under the hidden ${theme} theme`, () => accentTextMeetsAA(themed(theme)))
}

describe('the full-strength accents are documented as unusable for text', () => {
  // Not a lament — this is the fact the two-strength split exists for, and if it
  // ever stops being true (someone darkens the brand green) the split is dead
  // weight and should be collapsed rather than left to rot.
  for (const accent of ['color-moss', 'color-moss-2', 'color-clay'] as const) {
    it(`--${accent} still fails on --color-sand, so the -ink split is still earning its keep`, () => {
      expect(contrast(token(accent), token('color-sand'))).toBeLessThan(AA_NORMAL_TEXT)
    })
  }
})
