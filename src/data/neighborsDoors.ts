export type Door = {
  id: string
  title: string
  intro: string
  body: string
  bullets: string[]
  ctaLabel: string
  href: string
}

export const neighborsDoors: Door[] = [
  {
    id: 'care',
    title: 'Need support right now?',
    intro:
      'If you’re in a difficult season — illness, grief, family stress, or simply feeling overwhelmed — support at Pine Lake often begins quietly and personally.',
    body: 'Care here usually looks simple and human: a conversation, prayer if that’s meaningful to you, practical help like meals, and connection to others who can walk with you.',
    bullets: [
      'Pastoral care and prayer',
      'Meals and practical support during illness or crisis',
      'Support groups, including Alzheimer’s support',
      'Care and presence around memorial services and times of loss',
    ],
    ctaLabel: 'Care & Support',
    href: '/for-our-neighbors/care-support/',
  },
  {
    id: 'connection',
    title: 'Looking for connection or community?',
    intro:
      'Many people find their way to Pine Lake because they’re new to the area, rebuilding community, or looking for something more grounded and relational.',
    body: 'There are easy, low-pressure ways to connect — some social, some spiritual, some simply about showing up and seeing what fits.',
    bullets: [
      'Community meals and gatherings, like Tuesdays Together',
      'Open events and shared activities',
      'Groups and rhythms that help people get to know one another over time',
    ],
    ctaLabel: 'What’s Happening',
    href: '/whats-happening/',
  },
  {
    id: 'families',
    title: 'Have kids or teens?',
    intro: 'Finding healthy places for kids and teens to belong — and support for parents along the way — matters.',
    body: 'Our family and youth spaces are built around safety, warmth, and real relationships, not just programs.',
    bullets: [
      'Pine Lake Youth (middle and high school)',
      'MomCo, a community for moms of young children',
      'Kids programs during Sunday services',
    ],
    ctaLabel: 'Families & Youth',
    href: '/families/',
  },
  {
    id: 'space',
    title: 'Need a space to gather?',
    intro: 'We believe our building is a shared community resource.',
    body: 'That means hosting weddings and memorials, and also opening our spaces to community groups and nonprofits whose work benefits the wider region.',
    bullets: [
      'Weddings and memorial services',
      'Community groups and nonprofit gatherings',
      'Programs that serve the local community',
    ],
    ctaLabel: 'Weddings & Memorials',
    href: '/for-our-neighbors/weddings-memorials/',
  },
  {
    id: 'serve',
    title: 'Want to serve locally?',
    intro: 'If you’re looking for a way to make a difference nearby, you don’t need to invent something new.',
    body: 'We partner with local organizations we trust and join them with time, relationships, and practical help. For many people, serving becomes a way to build community while contributing to something larger.',
    bullets: ['Issaquah Food Bank', 'Bright Bridge', 'Echo Glen', 'Young Life'],
    ctaLabel: 'Serve Locally',
    href: '/for-our-neighbors/serve-locally/',
  },
]
