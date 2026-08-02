// The production build. Wraps `astro build` in `tinacms build`, choosing the CMS
// flags from whether TinaCloud credentials are present.
//
// This is a script rather than a line in package.json because the flag choice is a
// real decision with a real consequence, and it needs explaining:
//
//   No credentials  → --local --skip-cloud-checks
//     Reads content from disk and emits a client pointed at http://localhost:4001,
//     the datalayer that only exists while a build runs. Correct for CI and for a
//     fresh clone — neither has credentials, and neither should need them. But a
//     site deployed this way has a dead /tina-island: nothing answers on 4001 in a
//     Worker, so the route returns "Island render failed" and visual editing is
//     inert. Observed on plcc.dev before TinaCloud was set up.
//
//   Credentials    → --content=local
//     Still builds from files on disk — same speed, no network, identical HTML —
//     but emits a *production* client that talks to TinaCloud once deployed. This
//     is the flag that makes the deployed editor work. It needs branch, clientId
//     and token together; the CLI rejects it otherwise, which is why it couldn't
//     be adopted before there was an account.
//
// The output HTML is the same either way, so CI still verifies what deploys even
// though it builds by the first path. Only the client URL baked into the bundle
// differs.
//
// Whether /admin is compiled and published is a separate switch, TINA_PUBLISH_ADMIN
// — see scripts/prune-admin.mjs and the patch under patches/. Credentials alone do
// not ship the admin, deliberately: the two answer different questions, and a
// deploy can reasonably want the island route live without the editor on it.
//
// Two environment settings are forced here rather than left to the host, because
// both have already broken a deploy and a dashboard is a setting the repo can't
// assert:
//
//   NODE_OPTIONS=--max-old-space-size=4096 — Tina's indexer needs more than the
//     2 GB Node defaults to in Cloudflare's build container, and dies in "Indexing
//     local files" with "Ineffective mark-compacts near heap limit".
//   NODE_ENV=production — `tinacms build` sets NODE_ENV=development for the command
//     it wraps, which makes import.meta.env.PROD false and silently flips both PROD
//     branches we have: events fall back to the curated list instead of the Church
//     Center snapshot, and draft pages get published.

import { spawnSync } from 'node:child_process'

const cloud = Boolean(process.env.PUBLIC_TINA_CLIENT_ID && process.env.TINA_TOKEN)
const flags = cloud ? ['--content=local'] : ['--local', '--skip-cloud-checks']

console.log(
  cloud
    ? 'build: TinaCloud credentials found — emitting a production client (/tina-island will work when deployed).'
    : 'build: no TinaCloud credentials — emitting a local client. Correct for CI and local builds; a deploy made this way has no working /tina-island.'
)

const result = spawnSync('tinacms', ['build', ...flags, '-c', 'NODE_ENV=production astro build'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error(`✗ build: could not run tinacms — ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
