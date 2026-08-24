// Sunday service archive, sourced from the church's YouTube channel RSS feed at
// build time. The feed is parsed with regex (the feed shape is small and stable);
// if the fetch fails we fall back to a hardcoded recent list so the page always
// renders. Extracted from messages.astro to keep the page a view.
//
// The feed is the only machine-readable source available: Planning Center
// Publishing/Sermons is not enabled for this church, so there is no PCO
// endpoint carrying sermon metadata. A YouTube title is all we get — no
// speaker, series or passage — which is why the page renders dates, not names.

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
  { title: 'Sunday Service - April 26, 2026', dateLabel: 'April 26, 2026', videoId: 'Z8DQgRFGjoc' },
  { title: 'Sunday Service - April 19, 2026', dateLabel: 'April 19, 2026', videoId: 'xk3tBosFt4I' },
  { title: 'Sunday Service - April 12, 2026', dateLabel: 'April 12, 2026', videoId: 'v_TUOAL2dzo' },
  { title: 'Sunday Service - April 5, 2026', dateLabel: 'April 5, 2026', videoId: '9t8ktly3i0o' },
  { title: 'Sunday Service - March 29, 2026', dateLabel: 'March 29, 2026', videoId: '6bMJIqiELVk' },
  { title: 'Sunday Service - March 22, 2026', dateLabel: 'March 22, 2026', videoId: '-llHi5tmsds' },
  { title: 'Sunday Service - March 15, 2026', dateLabel: 'March 15, 2026', videoId: 'XWof2n2Z6yg' },
  { title: 'Sunday Service - March 8, 2026', dateLabel: 'March 8, 2026', videoId: '1V1o2CIVpfQ' },
  { title: 'Sunday Service - March 1, 2026', dateLabel: 'March 1, 2026', videoId: '0z_3WMaP5Og' },
  { title: 'Sunday Service - February 22, 2026', dateLabel: 'February 22, 2026', videoId: 'ylhP0KAYv1Y' },
  { title: 'Sunday Service - February 15, 2026', dateLabel: 'February 15, 2026', videoId: 'TZHDN98aflk' },
  { title: 'Sunday Service - February 8, 2026', dateLabel: 'February 8, 2026', videoId: 'MIz6XO63p3o' },
  { title: 'Sunday Service - February 1, 2026', dateLabel: 'February 1, 2026', videoId: 'qhqozisz1F8' },
  { title: 'Sunday Service - January 25, 2026', dateLabel: 'January 25, 2026', videoId: 'r7g8zwK-3UQ' },
  { title: 'Sunday Service - January 18, 2026', dateLabel: 'January 18, 2026', videoId: 'At5sziEX4l8' },
]

const asService = (service: SundayServiceSeed): SundayService => ({
  ...service,
  watchUrl: `https://www.youtube.com/watch?v=${service.videoId}`,
  embedUrl: `https://www.youtube.com/embed/${service.videoId}`,
  thumbnailUrl: `https://i.ytimg.com/vi/${service.videoId}/hqdefault.jpg`,
})

const decodeXml = (input: string) =>
  input
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')

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
      const title = decodeXml(entryXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '')
      if (!title.startsWith('Sunday Service')) {
        return null
      }

      const videoId = entryXml.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1]?.trim() ?? ''
      if (!videoId) {
        return null
      }

      const linkHref =
        decodeXml(entryXml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?\s*>/)?.[1] ?? '') ||
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
    if (feedResponse.ok) {
      const parsed = extractSundayServicesFromFeed(await feedResponse.text())
      if (parsed.length > 0) {
        services = parsed
      }
    }
  } catch {
    // Keep fallback services when the RSS fetch is unavailable.
  }

  const [latest, ...archive] = services
  return { latest, archive }
}
