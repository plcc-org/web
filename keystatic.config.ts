import { config, collection, singleton, fields } from '@keystatic/core'

// Keystatic CMS configuration. In dev we use `local` storage (reads/writes the
// repo on disk); in production (Cloudflare Pages) we use `github` storage, where
// edits commit to the repo through a GitHub App. The schemas below must stay
// aligned with the Astro content schemas in src/content.config.ts — Astro
// validates these same files at build time.
//
// Photos are deliberately NOT a CMS collection: the 442-entry catalog
// (src/content/photos.json) is build-time infrastructure. Editors add and pick
// photos through image fields on page blocks (see the `pages` collection).
export default config({
  storage: import.meta.env.DEV ? { kind: 'local' } : { kind: 'github', repo: 'timsneath/plcc-web' },

  ui: {
    brand: { name: 'Pine Lake Covenant Church' },
  },

  collections: {
    // Signature youth moments — folder of frontmatter-only Markdown entries.
    youthMoments: collection({
      label: 'Youth moments',
      slugField: 'title',
      path: 'src/content/youth-moments/*',
      format: { contentField: undefined },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        when: fields.text({
          label: 'When',
          description: 'A human label — a date range ("August 10–17, 2026") or a cadence ("Each spring").',
          validation: { isRequired: false },
        }),
        blurb: fields.text({ label: 'Blurb', multiline: true }),
        photo: fields.text({
          label: 'Photo filename',
          description: 'A filename from the photo catalog (src/content/photos.json).',
          validation: { isRequired: false },
        }),
        featured: fields.checkbox({
          label: 'Featured',
          description: 'Featured moments get a large card; the rest fall into a compact list.',
          defaultValue: false,
        }),
        order: fields.integer({ label: 'Order', defaultValue: 0 }),
        link: fields.conditional(fields.checkbox({ label: 'Include a link' }), {
          false: fields.empty(),
          true: fields.object({
            label: fields.text({ label: 'Link label' }),
            href: fields.text({ label: 'Link URL' }),
          }),
        }),
      },
    }),

    // Pastors and staff — folder of frontmatter-only Markdown entries; the bio
    // lives in a field (rendered as Markdown), the portrait is uploaded into
    // src/assets/images and stored as the same relative path the build resolves.
    leadership: collection({
      label: 'Leadership',
      slugField: 'name',
      path: 'src/content/leadership/*',
      format: { contentField: undefined },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        title: fields.text({ label: 'Role / title' }),
        portrait: fields.image({
          label: 'Portrait',
          directory: 'src/assets/images',
          publicPath: '../../assets/images/',
          validation: { isRequired: true },
        }),
        portraitAlt: fields.text({ label: 'Portrait alt text' }),
        bio: fields.text({ label: 'Bio', multiline: true }),
        order: fields.integer({ label: 'Order', defaultValue: 0 }),
        link: fields.conditional(fields.checkbox({ label: 'Include a link' }), {
          false: fields.empty(),
          true: fields.object({
            label: fields.text({ label: 'Link label' }),
            href: fields.text({ label: 'Link URL' }),
          }),
        }),
      },
    }),
  },

  // Short ordered lists, each a single YAML file edited as an array. The Astro
  // loaders parse both the hand-authored bare-array form and this wrapped form
  // (see yamlList() in src/content.config.ts).
  singletons: {
    homeQuotes: singleton({
      label: 'Homepage quotes',
      path: 'src/content/quotes',
      format: { data: 'yaml' },
      schema: {
        quotes: fields.array(
          fields.object({
            id: fields.text({ label: 'ID' }),
            order: fields.integer({ label: 'Order', defaultValue: 0 }),
            text: fields.text({ label: 'Quote', multiline: true }),
            by: fields.text({ label: 'Attribution', validation: { isRequired: false } }),
          }),
          { label: 'Quotes', itemLabel: (p) => p.fields.by.value || p.fields.id.value }
        ),
      },
    }),

    neighborDoors: singleton({
      label: 'Neighbor doors',
      path: 'src/content/neighbor-doors',
      format: { data: 'yaml' },
      schema: {
        doors: fields.array(
          fields.object({
            id: fields.text({ label: 'ID' }),
            order: fields.integer({ label: 'Order', defaultValue: 0 }),
            title: fields.text({ label: 'Title' }),
            intro: fields.text({ label: 'Intro', multiline: true }),
            body: fields.text({ label: 'Body', multiline: true }),
            bullets: fields.array(fields.text({ label: 'Bullet' }), { label: 'Bullets' }),
            ctaLabel: fields.text({ label: 'Button label' }),
            href: fields.text({ label: 'Button URL' }),
          }),
          { label: 'Doors', itemLabel: (p) => p.fields.title.value || p.fields.id.value }
        ),
      },
    }),

    startHereLinks: singleton({
      label: 'Start-here links',
      path: 'src/content/start-here-links',
      format: { data: 'yaml' },
      schema: {
        links: fields.array(
          fields.object({
            id: fields.text({ label: 'ID' }),
            group: fields.select({
              label: 'Group',
              options: [
                { label: 'Homepage', value: 'home' },
                { label: "I'm New page", value: 'im-new' },
              ],
              defaultValue: 'home',
            }),
            order: fields.integer({ label: 'Order', defaultValue: 0 }),
            title: fields.text({ label: 'Title' }),
            meta: fields.text({ label: 'Meta' }),
            href: fields.text({ label: 'URL' }),
          }),
          { label: 'Links', itemLabel: (p) => `${p.fields.title.value} (${p.fields.group.value})` }
        ),
      },
    }),
  },
})
