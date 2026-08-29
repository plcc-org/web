// Sunday service archive, sourced from the church's YouTube channel RSS feed at
// build time. The feed is parsed with regex (the feed shape is small and stable);
// if the fetch fails we fall back to a hardcoded recent list so the page always
// renders. Extracted from messages.astro to keep the page a view.
//
// The feed is the only machine-readable source available: Planning Center
// Publishing/Sermons is not enabled for this church, so there is no PCO
// endpoint carrying sermon metadata. A YouTube title is all we get — no
// speaker, series or passage — which is why the page renders dates, not names.

import { decodeEntities } from '../markdown'

const CHANNEL_ID = 'UC1eeiv-tSWoCkB33rskGggw'
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`

export type SundayServiceSeed = {
  title: string
  dateLabel: string
  videoId: string
}

export type SundayService = SundayServiceSeed & {
  watchUrl: string
  embedUrl: string
  thumbnailUrl: string
}

const fallbackSundayServices: SundayServiceSeed[] = [
  { title: 'Sunday Service - August 23, 2026', dateLabel: 'August 23, 2026', videoId: 'zGKTO8WYfi4' },
  { title: 'Sunday Service - August 16, 2026', dateLabel: 'August 16, 2026', videoId: 'iQnj153Yhkc' },
  { title: 'Sunday Service - August 9, 2026', dateLabel: 'August 9, 2026', videoId: 'MKNn2FwOYNQ' },
  { title: 'Sunday Service - August 2, 2026', dateLabel: 'August 2, 2026', videoId: 'Ysx6bEEVJMo' },
  { title: 'Sunday Service - July 26, 2026', dateLabel: 'July 26, 2026', videoId: '_9xNQcW8TOQ' },
  { title: 'Sunday Service - July 19, 2026', dateLabel: 'July 19, 2026', videoId: 'LykIEQyxh50' },
  { title: 'Sunday Service - July 12, 2026', dateLabel: 'July 12, 2026', videoId: 'di_wpu9twnE' },
  { title: 'Sunday Service - July 5, 2026', dateLabel: 'July 5, 2026', videoId: 'vN_7PtMdtaM' },
  { title: 'Sunday Service - June 28, 2026', dateLabel: 'June 28, 2026', videoId: 'MW70HwSgGmE' },
  { title: 'Sunday Service - June 21, 2026', dateLabel: 'June 21, 2026', videoId: 'hmk4SyhbJ6k' },
  { title: 'Sunday Service - June 14, 2026', dateLabel: 'June 14, 2026', videoId: 'fLzKku1FsaI' },
  { title: 'Sunday Service - June 7, 2026', dateLabel: 'June 7, 2026', videoId: 'tzBOXoM8wjU' },
  { title: 'Sunday Service - May 31, 2026', dateLabel: 'May 31, 2026', videoId: 'z_VYh98eSoY' },
  { title: 'Sunday Service - May 24, 2026', dateLabel: 'May 24, 2026', videoId: 'cCMZOwGOiyI' },
  { title: 'Sunday Service - May 17, 2026', dateLabel: 'May 17, 2026', videoId: 'XXdVtJkfgVM' },
]

const asService = (service: SundayServiceSeed): SundayService => ({
  ...service,
  watchUrl: `https://www.youtube.com/watch?v=${service.videoId}`,
  embedUrl: `https://www.youtube.com/embed/${service.videoId}`,
  thumbnailUrl: `https://i.ytimg.com/vi/${service.videoId}/hqdefault.jpg`,
})

const formatPublishedDate = (iso: string) => {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const extractSundayServicesFromFeed = (xml: string): SundayService[] => {
  const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]

  return entryMatches
    .map((match) => match[1])
    .map((entryXml) => {
      const title = decodeEntities(entryXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '')
      if (!title.startsWith('Sunday Service')) {
        return null
      }

      const videoId = entryXml.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1]?.trim() ?? ''
      if (!videoId) {
        return null
      }

      const linkHref =
        decodeEntities(entryXml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?\s*>/)?.[1] ?? '') ||
        `https://www.youtube.com/watch?v=${videoId}`

      const publishedIso = entryXml.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() ?? ''
      const titleDate = title.split(' - ')[1]?.trim() ?? ''

      return {
        title,
        dateLabel: titleDate || formatPublishedDate(publishedIso),
        videoId,
        watchUrl: linkHref,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }
    })
    .filter((service): service is SundayService => Boolean(service))
}

/** Latest Sunday service plus the archive (live from YouTube, with a fallback). */
export async function getSundayServices(): Promise<{ latest: SundayService; archive: SundayService[] }> {
  let services: SundayService[] = fallbackSundayServices.map(asService)

  try {
    const feedResponse = await fetch(FEED_URL)
    const parsed = feedResponse.ok ? extractSundayServicesFromFeed(await feedResponse.text()) : []
    if (parsed.length > 0) {
      services = parsed
    } else {
      console.warn(
        `[messages] YouTube feed returned no usable services (HTTP ${feedResponse.status}) — using the hardcoded fallback list`
      )
    }
  } catch (error) {
    // Keep fallback services when the RSS fetch is unavailable.
    console.warn('[messages] YouTube feed fetch failed — using the hardcoded fallback list:', error)
  }

  const [latest, ...archive] = services
  return { latest, archive }
}
