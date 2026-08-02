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
// `--skip-cloud-checks` is passed on both paths, and on the credentialed one it is
// load-bearing. The check it disables SHA-compares the local `_schema.json` against
// the schema TinaCloud last indexed for this branch, and fails the build when they
// differ. TinaCloud indexes from the GitHub push; Cloudflare builds from the same
// push. So on any deploy that changes `tina/config.ts`, the build reaches the check
// before TinaCloud has re-indexed and dies on ERR_CLOUD_CHECK_FAILED — a race the
// site loses roughly as often as it wins. The CLI's `waitForDB` does not cover this:
// it polls only while indexing is *in progress*, so a TinaCloud that hasn't started
// on the new commit reports 'complete' for the previous one and the check proceeds
// against a stale schema.
//
// Skipping it costs nothing that a deploy needs. Codegen runs before the check and
// is unaffected by it, so the emitted client is byte-identical either way; the check
// is a pre-flight warning, not a build input. What it would have told us — that
// TinaCloud is briefly behind — is true by construction on every schema change and
// resolves itself within minutes, with nothing to act on in the meantime.
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
