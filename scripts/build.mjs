// The production build. Wraps `astro build` in `tinacms build`, choosing the CMS
// flags from whether TinaCloud credentials are present.
//
// This is a script rather than a line in package.json because the flag choice is a
// real decision with a real consequence, and it needs explaining:
//
//   No credentials  → --local
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
// `--skip-cloud-checks` goes on both paths, and on the credentialed one that is a
// judgement call worth stating. The check it disables compares the schema this build
// generated against the one TinaCloud has indexed — and TinaCloud gets its schema by
// indexing `tina/tina-lock.json` out of the GitHub repo. So the check is really
// asking "is the committed lock file in step with tina/config.ts?", one round trip
// removed, on a machine that can only answer at deploy time.
//
// `scripts/check-tina-lock.mjs` asks that question directly: same defect, caught in
// GitHub CI without credentials, naming the file. That leaves the cloud check adding
// only the two ways it can fail while nothing is wrong:
//
//   - It always checks `branch` — `main` here, since TINA_BRANCH is unset. A preview
//     build of a branch whose schema differs from main's therefore fails by
//     construction, however correct that branch is. PR #34's own build failed this
//     way, on the commit that fixed the lock file.
//   - On the deploy that lands a schema change, the build and TinaCloud's re-index
//     start from the same push. Beat the indexer and the check fails on a state that
//     is seconds from being right; retry and it passes.
//
// Skipping costs no output: codegen runs before the check and is unaffected by it, so
// the emitted client is byte-identical. What it does cost is the one case the lock
// guard can't see — TinaCloud indexed something genuinely different, or failed to
// index at all. That surfaces in the editor as "GraphQL Schema Mismatch", which is
// where it belongs. A static site for a church should not stop deploying because a
// third party's indexer is behind.
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
const flags = cloud ? ['--content=local'] : ['--local']

console.log(
  cloud
    ? 'build: TinaCloud credentials found — emitting a production client (/tina-island will work when deployed).'
    : 'build: no TinaCloud credentials — emitting a local client. Correct for CI and local builds; a deploy made this way has no working /tina-island.'
)

const args = ['build', ...flags, '--skip-cloud-checks', '-c', 'NODE_ENV=production astro build']

const result = spawnSync('tinacms', args, {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error(`✗ build: could not run tinacms — ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
