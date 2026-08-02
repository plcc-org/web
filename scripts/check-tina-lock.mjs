// Verifies that the committed `tina/tina-lock.json` still matches `tina/config.ts`.
//
// The lock file is not a lockfile in the npm sense. It is the *compiled schema*, and
// it is what TinaCloud indexes — TinaCloud reads it out of the GitHub repo. The
// running site's schema, by contrast, is generated fresh from `tina/config.ts` on
// every build. So the two can disagree, and when they do TinaCloud is serving a
// schema the site no longer has.
//
// Nothing regenerates it automatically on the path most changes take. `tinacms build`
// does not write it; only `tinacms dev` does. Edit `tina/config.ts` without running
// `npm run dev:tina`, and the lock file silently stays behind.
//
// The failure that follows is remote and late. The deploy dies in `tinacms build`
// with ERR_CLOUD_CHECK_FAILED and a message that reads like a timing problem —
// "please push up your changes to GitHub" — when the changes are already pushed and
// waiting fixes nothing. Skip that check and the deploy succeeds, but the editor then
// opens on "GraphQL Schema Mismatch" and offers the same misleading advice. Both have
// happened here, in that order, off one commit that removed a single unused field.
//
// Hence this check, which runs on every build and names the real cause. It rebuilds
// the lock from the three files codegen just emitted — exactly as the CLI composes it
// — and compares. `--write` regenerates it instead of failing, which is the fix.

import fs from 'node:fs'
import path from 'node:path'

const GENERATED = 'tina/__generated__'
const LOCK = 'tina/tina-lock.json'

// The CLI writes JSON.stringify of these three, in this order, unformatted. Match it
// byte for byte — a re-ordered or pretty-printed file would compare unequal forever.
const parts = { schema: '_schema.json', lookup: '_lookup.json', graphql: '_graphql.json' }

const missing = Object.values(parts).filter((f) => !fs.existsSync(path.join(GENERATED, f)))
if (missing.length) {
  console.error(
    `✗ check-tina-lock: ${GENERATED}/ is missing ${missing.join(', ')}. ` +
      `This runs after codegen — build first (npm run build).`
  )
  process.exit(1)
}

const expected = JSON.stringify(
  Object.fromEntries(
    Object.entries(parts).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(GENERATED, file), 'utf8'))])
  )
)

if (process.argv.includes('--write')) {
  fs.writeFileSync(LOCK, expected)
  console.log(`check-tina-lock: wrote ${LOCK} from ${GENERATED}/. Commit it.`)
  process.exit(0)
}

const actual = fs.existsSync(LOCK) ? fs.readFileSync(LOCK, 'utf8') : null

if (actual === expected) {
  console.log('check-tina-lock: tina-lock.json matches tina/config.ts.')
  process.exit(0)
}

console.error(
  `\n✗ check-tina-lock: ${LOCK} does not match tina/config.ts.\n\n` +
    `  TinaCloud indexes this file, so it is the schema the editor and /tina-island\n` +
    `  see. Left stale, the next deploy fails with ERR_CLOUD_CHECK_FAILED, or the\n` +
    `  editor opens on "GraphQL Schema Mismatch". Neither message names this file.\n\n` +
    `  Regenerate and commit it:\n\n` +
    `    npm run tina:lock\n`
)
process.exit(1)
