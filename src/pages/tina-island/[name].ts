import type { APIRoute } from 'astro'
import { experimental_createIslandRoute } from '@tinacms/astro/experimental'
import { islands } from '../../lib/tina/islands'

// The on-demand endpoint the visual-editing bridge re-renders regions through.
// It is the one route that must stay dynamic; every page still prerenders.
export const prerender = false
export const ALL: APIRoute = experimental_createIslandRoute(islands)
