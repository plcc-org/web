import { config, collection, fields } from '@keystatic/core'

// Keystatic CMS configuration. In dev we use `local` storage (reads/writes the
// repo on disk); in production (Cloudflare Pages) we use `github` storage, where
// edits commit to the repo through a GitHub App. The collection schemas below
// must stay aligned with the Astro content schemas in src/content.config.ts —
// Astro validates these same files at build time.
export default config({
  storage: import.meta.env.DEV ? { kind: 'local' } : { kind: 'github', repo: 'timsneath/plcc-web' },

  ui: {
    brand: { name: 'Pine Lake Covenant Church' },
  },

  collections: {
    // Signature youth moments — folder of frontmatter-only Markdown entries.
    // Maps 1:1 to the `youthMoments` Astro collection (glob loader).
    youthMoments: collection({
      label: 'Youth moments',
      slugField: 'title',
      path: 'src/content/youth-moments/*',
      // Frontmatter only — these entries carry no body copy.
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
  },
})
