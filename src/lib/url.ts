// Prefix an internal path with the configured base path (import.meta.env.BASE_URL)
// so links resolve under sub-path deployments (e.g. GitHub Pages '/plcc-web/') as
// well as root-served builds. Accepts paths with or without a leading slash;
// BASE_URL is always normalized by Astro to end in a trailing slash.
const BASE = import.meta.env.BASE_URL

export function withBase(path = ''): string {
  return BASE + path.replace(/^\//, '')
}
