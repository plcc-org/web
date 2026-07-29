import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Pins the one thing in public/_headers whose failure is invisible.
//
// `frame-ancestors 'none'` is the obvious hardening, and it was what this file
// shipped. It also blocks framing by the *same origin*, which breaks the CMS's
// visual editing: /admin embeds the real page in an iframe, and the preview pane
// comes up blank. Nothing errors, no build fails, and it cannot be reproduced
// locally — `_headers` is read by Cloudflare, so a dev server never applies it.
//
// So the invariant is: no *other* site may frame ours, and ours must be able to.
// A test rather than a comment because the tempting edit is a one-word change in
// the safe-looking direction, and the symptom appears somewhere else entirely.

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf-8')

describe('public/_headers', () => {
  it('allows same-origin framing, which visual editing needs', () => {
    expect(headers).toMatch(/Content-Security-Policy:\s*frame-ancestors\s+'self'/)
    expect(headers).not.toMatch(/frame-ancestors\s+'none'/)
  })

  it('still refuses framing by other sites', () => {
    // 'self' is the whole allow-list: no wildcard, no third-party origin.
    const directive = headers.match(/Content-Security-Policy:\s*frame-ancestors\s+([^\n]+)/)?.[1].trim()
    expect(directive).toBe("'self'")
  })

  it('keeps the other security headers that carry no CMS trade-off', () => {
    expect(headers).toMatch(/X-Content-Type-Options:\s*nosniff/)
    expect(headers).toMatch(/Referrer-Policy:\s*strict-origin-when-cross-origin/)
    expect(headers).toMatch(/Strict-Transport-Security:\s*max-age=\d+/)
  })
})
