import { describe, it, expect } from 'vitest'
import { checkLinkUrl, checkOptionalLink } from '../tina/link-rules.mjs'

describe('checkLinkUrl', () => {
  it('accepts websites, emails and pages on this site', () => {
    expect(checkLinkUrl('https://plcc.churchcenter.com/people/forms/1061580')).toBeUndefined()
    expect(checkLinkUrl('mailto:kimw@plcc.org')).toBeUndefined()
    expect(checkLinkUrl('mailto:pastors@plcc.org?subject=Hello')).toBeUndefined()
    expect(checkLinkUrl('/events/')).toBeUndefined()
  })

  it('names the fix for the likely mistakes', () => {
    expect(checkLinkUrl('http://plcc.org')).toMatch(/https:\/\/ version/)
    expect(checkLinkUrl('plcc.churchcenter.com/giving')).toMatch(/https:\/\/plcc\.churchcenter\.com\/giving/)
    expect(checkLinkUrl('kimw@plcc.org')).toMatch(/mailto:kimw@plcc\.org/)
    expect(checkLinkUrl('mailto:')).toMatch(/needs an address/)
    expect(checkLinkUrl('https://plcc.org/a b')).toMatch(/space/)
  })

  it('rejects what is not a link at all', () => {
    expect(checkLinkUrl('')).toBeDefined()
    expect(checkLinkUrl('//cdn.example.org')).toBeDefined()
    expect(checkLinkUrl('#announcements')).toBeDefined()
    expect(checkLinkUrl('tel:+14253928636')).toBeDefined()
  })
})

describe('checkOptionalLink', () => {
  it('lets the field stay blank', () => {
    expect(checkOptionalLink('')).toBeUndefined()
    expect(checkOptionalLink('   ')).toBeUndefined()
    expect(checkOptionalLink(undefined)).toBeUndefined()
  })

  it('accepts what a page link can be, including phone numbers and same-page jumps', () => {
    expect(checkOptionalLink('/visit/')).toBeUndefined()
    expect(checkOptionalLink('https://covchurch.org')).toBeUndefined()
    expect(checkOptionalLink('mailto:mopscoordinator@plcc.org')).toBeUndefined()
    expect(checkOptionalLink('tel:+14253928636')).toBeUndefined()
    expect(checkOptionalLink('#sundays')).toBeUndefined()
  })

  it('names the fix when a link is filled in wrongly', () => {
    expect(checkOptionalLink('about/pastors-letter/')).toMatch(/Start with https:\/\//)
    expect(checkOptionalLink('www.themom.co')).toMatch(/https:\/\/www\.themom\.co/)
  })
})
