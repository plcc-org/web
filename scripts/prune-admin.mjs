// Keeps the CMS admin out of the published site unless it has a backend to talk to.
//
// On a deployed static site there is no data layer: the admin SPA loads, calls
// getUser / isAuthenticated / getBillingState against TinaCloud, and fails on every
// one — an 11 MB publicly-reachable dead end. So publishing it is opt-in. Set
// TINA_PUBLISH_ADMIN=true once the editor has an auth backend (see docs/cms.md).
// Explicit rather than inferred from credentials, because shipping a login page to
// the public internet should be something somebody chose.
//
// That same flag now also decides whether the SPA is compiled at all — see the
// postinstall note in package.json. So on a clean build there is usually nothing
// here to remove. This still runs because public/admin is a working directory, not
// a build output: a local `npm run dev:tina` session leaves one behind, and astro
// build would happily copy it into dist/. Belt and braces, cheap either way.
//
// Local dev is unaffected — `npm run dev:tina` serves /admin from public/, which
// this never touches.

import { rmSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ADMIN = 'dist/client/admin'

if (process.env.TINA_PUBLISH_ADMIN === 'true') {
  console.log('prune-admin: TINA_PUBLISH_ADMIN=true — publishing /admin.')
  process.exit(0)
}

if (!existsSync(ADMIN)) {
  console.log('prune-admin: no dist/client/admin to remove.')
  process.exit(0)
}

const bytes = (dir) =>
  readdirSync(dir, { recursive: true })
    .map((f) => join(dir, f))
    .filter((f) => statSync(f).isFile())
    .reduce((sum, f) => sum + statSync(f).size, 0)

const size = bytes(ADMIN)
rmSync(ADMIN, { recursive: true, force: true })
console.log(
  `prune-admin: removed /admin (${(size / 1024 / 1024).toFixed(1)} MB) — it has no backend when deployed. Set TINA_PUBLISH_ADMIN=true to publish it.`
)
