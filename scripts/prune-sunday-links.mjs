// Deletes Sunday links weeks the page will never show again: every file dated before
// the live week. Run nightly by .github/workflows/capture-events.yml, which commits the
// deletions — so the CMS list only ever holds the week that's live and the ones being
// prepared, and nobody has to tidy it.
//
// The live week is kept, because it's what an editor duplicates to start the next one.
// A file with no readable date is left alone: the build's zod check reports it, and
// deleting something nobody can identify is the wrong way to find out what it was.
//
//   node scripts/prune-sunday-links.mjs            delete past weeks
//   node scripts/prune-sunday-links.mjs --dry-run  list them only

import { readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { church } from '../src/config/church.ts'
import { churchToday, pastWeeks, toIsoDate } from '../tina/sunday-links.mjs'

const DIR = 'src/content/sunday-links'
const dryRun = process.argv.includes('--dry-run')

const weeks = readdirSync(DIR)
  .filter((file) => /\.ya?ml$/.test(file))
  .map((file) => ({ file, sunday: toIsoDate(parse(readFileSync(join(DIR, file), 'utf-8'))?.sunday) }))
  .filter((week) => week.sunday)

const today = churchToday(church.timezone)
const past = pastWeeks(weeks, today)

if (!past.length) console.log(`Sunday links: nothing to clear (today is ${today}).`)
for (const { file, sunday } of past) {
  if (!dryRun) unlinkSync(join(DIR, file))
  console.log(`Sunday links: ${dryRun ? 'would delete' : 'deleted'} ${DIR}/${file} (${sunday})`)
}
