import { defineConfig } from 'tinacms'
// @ts-expect-error — plain-JS template palette, shared with the spike harness.
import { templates } from './templates.mjs'

// Spike configuration. Models the `pages` collection from keystatic.config.ts:
// the same frontmatter shape (including the nested `hero` object) and the same
// 18-component body palette, so the editor can be judged against the real thing.
export default defineConfig({
  branch: 'spike/cms-tina',
  clientId: null,
  token: null,
  localContentPath: undefined,
  build: { outputFolder: 'admin', publicFolder: 'public' },
  media: {
    tina: {
      // Our photo bytes live in src/assets/images so Astro's sharp pipeline can
      // process them, not in public/. imageFromRef (src/lib/images.ts) strips
      // everything up to `assets/images/`, so this path shape resolves as-is.
      publicFolder: 'src',
      mediaRoot: 'assets/images',
    },
  },
  schema: {
    collections: [
      {
        name: 'leadership',
        label: 'Leadership',
        path: 'src/content/leadership',
        format: 'yaml',
        fields: [
          { name: 'name', label: 'Name', type: 'string', isTitle: true, required: true },
          { name: 'title', label: 'Title', type: 'string' },
          { name: 'portrait', label: 'Portrait', type: 'image' },
          { name: 'portraitAlt', label: 'Portrait description (alt text)', type: 'string' },
          { name: 'bio', label: 'Bio', type: 'string', ui: { component: 'textarea' } },
          { name: 'order', label: 'Order', type: 'number' },
          {
            name: 'link',
            label: 'Link',
            type: 'object',
            fields: [
              { name: 'label', label: 'Link label', type: 'string' },
              { name: 'href', label: 'Link URL', type: 'string' },
            ],
          },
        ],
      },
      {
        name: 'shortLinks',
        label: 'Short links',
        path: 'src/content/short-links',
        format: 'yaml',
        fields: [
          { name: 'name', label: 'Name', type: 'string', isTitle: true, required: true },
          { name: 'from', label: 'Old address', type: 'string' },
          { name: 'destination', label: 'Sends people to', type: 'string' },
          { name: 'kind', label: 'Kind', type: 'string', options: ['shortcut', 'moved', 'gone'] },
          { name: 'permanent', label: 'Never needs reviewing', type: 'boolean' },
          { name: 'expires', label: 'Review by', type: 'datetime' },
          { name: 'note', label: 'What is this for?', type: 'string', ui: { component: 'textarea' } },
        ],
      },
      {
        name: 'pages',
        label: 'Pages',
        path: 'src/content/pages',
        format: 'mdx',
        fields: [
          { name: 'title', label: 'Title', type: 'string', isTitle: true, required: true },
          { name: 'seoDescription', label: 'SEO description', type: 'string' },
          { name: 'draft', label: 'Draft', type: 'boolean' },
          {
            name: 'hero',
            label: 'Hero',
            type: 'object',
            fields: [
              { name: 'image', label: 'Photo', type: 'image' },
              { name: 'alt', label: 'Photo description (alt text)', type: 'string' },
              { name: 'eyebrow', label: 'Eyebrow', type: 'string' },
              { name: 'lede', label: 'Intro', type: 'string', ui: { component: 'textarea' } },
              { name: 'subhead', label: 'Subhead', type: 'string' },
              { name: 'logo', label: 'Wordmark logo', type: 'image' },
              { name: 'logoAlt', label: 'Logo description (alt text)', type: 'string' },
              { name: 'buttonLabel', label: 'Hero button label', type: 'string' },
              { name: 'buttonHref', label: 'Hero button link', type: 'string' },
            ],
          },
          { name: 'content', label: 'Body', type: 'rich-text', isBody: true, templates },
        ],
      },
    ],
  },
})
