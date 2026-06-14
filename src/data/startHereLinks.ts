export type LinkCardItem = {
  href: string
  title: string
  meta: string
}

export const startHereLinks: LinkCardItem[] = [
  {
    href: 'about/pastors-letter/',
    title: 'A Welcome from our Pastor',
    meta: 'A personal letter from Austin Bailey.',
  },
  {
    href: 'plan-a-visit/',
    title: 'Plan a Visit',
    meta: 'What Sundays are like.',
  },
  {
    href: 'families/',
    title: 'Families',
    meta: 'Kids, youth, and community.',
  },
  {
    href: 'messages/',
    title: 'Messages',
    meta: 'Watch a recent service.',
  },
]

// "I'm New" → for someone considering coming: get-to-know-us links, kept to four
// so they don't wrap. (Plan a Visit is already the hero CTA on that page.)
export const imNewStartHereLinks: LinkCardItem[] = [
  {
    href: 'about/what-were-about/',
    title: 'What We’re About',
    meta: 'What shapes our life together, in plain language.',
  },
  {
    href: 'about/pastors-letter/',
    title: 'A Welcome from our Pastor',
    meta: 'A personal letter from Austin Bailey.',
  },
  {
    href: 'about/beliefs/',
    title: 'What We Believe',
    meta: 'The convictions we hold, if you want the specifics.',
  },
  {
    href: 'messages/',
    title: 'Messages',
    meta: 'Watch or listen to a recent service.',
  },
]
