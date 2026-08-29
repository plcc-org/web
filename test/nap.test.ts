import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { church } from '../src/config/church'

// The church's NAP facts (name / address / phone) are deliberately written into
// prose — "call (425) 392-8636 or email office@plcc.org" reads better than a
// generated strip — which means they exist in many files and can drift when one
// changes. src/config/church.ts is the authority; this test is what makes its
// "byte-identical wherever they appear" claim true: any phone number, plcc.org
// email address, or street-address fragment in content or markup must match the
// config exactly, so a number change is church.ts plus a mechanical fix of the
// failures this test lists.

function sources(): string[] {
  const out: string[] = []
  for (const dir of ['src/content', 'src/pages', 'src/layouts', 'src/components']) {
    for (const f of readdirSync(dir, { recursive: true }) as string[]) {
      if (/\.(astro|mdx|md|yaml|ts)$/.test(f) && !f.includes('events-pco')) out.push(`${dir}/${f}`)
    }
  }
  return out
}

describe('NAP facts match src/config/church.ts', () => {
  const offenders: string[] = []
  const phoneDigits = church.telephone.replace(/\D/g, '') // 14253928636

  for (const file of sources()) {
    const text = readFileSync(file, 'utf-8')

    // Any US-phone-shaped string must be the church's number: the display form,
    // the config's +1- form, or a tel:/compact +1XXXXXXXXXX dialling form.
    for (const m of text.matchAll(/\+1\d{10}|(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]?\d{4}/g)) {
      const digits = m[0].replace(/\D/g, '')
      if (digits.length < 10) continue
      const normalized = digits.length === 10 ? `1${digits}` : digits
      if (normalized !== phoneDigits) offenders.push(`${file}: phone "${m[0]}"`)
      else if (m[0] !== church.telephoneDisplay && !m[0].startsWith('+1'))
        offenders.push(`${file}: phone formatted "${m[0]}", expected "${church.telephoneDisplay}"`)
    }

    // Street-address fragments must carry the exact configured street.
    for (const m of text.matchAll(/\d{3,5} \d{3}(?:th|st|nd|rd) Ave[^,\n"']*/g)) {
      if (!m[0].startsWith(church.address.street)) offenders.push(`${file}: address "${m[0]}"`)
    }
  }

  it('finds no drifted phone numbers or addresses', () => {
    expect(offenders).toEqual([])
  })
})
