// Adds `nodejs_compat` to the generated Worker config after the build.
//
// Tina's visual-editing island route (/tina-island/[name], the one on-demand
// route) keeps its per-request store in an AsyncLocalStorage, so the Worker
// bundle imports `node:async_hooks`. Without the compat flag that import has
// nothing to resolve to on workerd and the route fails at runtime — the build
// stays green, so nothing catches it until an editor opens the preview.
//
// The canonical fix is a root `wrangler.jsonc`, as tinacms/tina-astro-starter
// ships. We can't use one while Keystatic is still installed: @cloudflare/vite-
// plugin treats a root config as authoritative and `virtual:keystatic-config`
// then fails to resolve (verified — see docs/cms.md). Injecting post-build is
// the workaround docs/cms.md already prescribes. Once Keystatic is removed,
// delete this script and add the root config instead.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const CONFIG = 'dist/server/wrangler.json'
const FLAG = 'nodejs_compat'

if (!existsSync(CONFIG)) {
  console.error(`inject-worker-flags: ${CONFIG} not found — did the build run?`)
  process.exit(1)
}

const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
const flags = new Set(config.compatibility_flags ?? [])
if (flags.has(FLAG)) {
  console.log(`inject-worker-flags: ${FLAG} already set`)
} else {
  flags.add(FLAG)
  config.compatibility_flags = [...flags]
  writeFileSync(CONFIG, JSON.stringify(config))
  console.log(`inject-worker-flags: added ${FLAG} → [${config.compatibility_flags.join(', ')}]`)
}
