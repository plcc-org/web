// Serves two built sites at once, so the production build and the Tina build can
// be opened side by side in two browser windows. Usage:
//
//   node spike/serve-builds.mjs
//   node spike/serve-builds.mjs --port 4101 --tina-port 4102
//
// This is a plain static file server, not `astro preview`: the Cloudflare adapter's
// preview runs the built Worker through wrangler, which would compare the Tina build
// against a baseline served a different way. Serving both from the same code keeps
// the only variable the build itself.
//
// The ports avoid 4321 (astro dev) and 4001/9000 (the CMS data layer). 4001 is the
// trap: leave a server on it and the next `npm run build:tina` fails at prerendering
// with a bare "404, Not Found", because the build's GraphQL queries reach this
// instead of Tina.
//
// What it does not do is redirects — `public/_redirects` is a Cloudflare artefact
// with no local equivalent, so short links 404 here on both sides. Everything that
// belongs to a page renders.

import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, join, extname, resolve } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

// The baseline lives in its own worktree beside the main checkout, so that its
// node_modules can hold the dependencies this branch removed. Resolve it from git
// rather than from the cwd: this branch is itself usually checked out in a worktree
// nested under .claude/, where a relative "../" points somewhere else entirely.
const mainRoot = dirname(
  execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf-8' }).trim()
)

const TARGETS = [
  {
    label: 'baseline (main, Keystatic)',
    dir: opt('baseline', join(dirname(mainRoot), 'plcc-web-baseline', 'dist')),
    port: Number(opt('port', 4101)),
  },
  { label: 'tina     (spike/cms-tina) ', dir: opt('tina', 'dist'), port: Number(opt('tina-port', 4102)) },
]

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

const serve = ({ label, dir, port }) => {
  // The Cloudflare adapter emits public pages under dist/client.
  const root = resolve(existsSync(join(dir, 'client')) ? join(dir, 'client') : dir)
  if (!existsSync(root)) {
    console.error(`✗ ${label}: ${root} not found — build it first.`)
    process.exitCode = 1
    return
  }

  createServer((req, res) => {
    const path = decodeURIComponent(req.url.split(/[?#]/)[0])
    // Astro writes /visit/ as visit/index.html; accept the extensionless form too.
    const candidates = path.endsWith('/')
      ? [join(root, path, 'index.html')]
      : [join(root, path), join(root, `${path}.html`), join(root, path, 'index.html')]
    const hit = candidates.find((f) => existsSync(f) && statSync(f).isFile())

    if (!hit) {
      const notFound = join(root, '404.html')
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      res.end(existsSync(notFound) ? readFileSync(notFound) : 'Not found')
      return
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(hit)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    res.end(readFileSync(hit))
  }).listen(port, () => console.log(`  ${label}  →  http://localhost:${port}/   (${root})`))
}

console.log('Serving both builds:')
TARGETS.forEach(serve)
