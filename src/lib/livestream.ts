// Pure livestream timing (no astro: imports), so it can be unit tested directly and
// bundled into the banner's browser script — one copy of the rule for both.

export type StreamWindow = {
  /** IANA zone the service times are in. */
  timeZone: string
  /** English weekday name, as `church.service.day` spells it. */
  day: string
  /** 24-hour church-local start time, "HH:MM". */
  opens: string
  beforeMinutes: number
  afterMinutes: number
}

/**
 * Whether the service is streaming at `now`: on the service day, from `beforeMinutes`
 * ahead of `opens` until `afterMinutes` after it, both in church-local time. The end is
 * exclusive, so a 10:00 service with 10/90 shows 9:50 through 11:29.
 */
export function isStreamLive(now: Date, window: StreamWindow): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: window.timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  if (part('weekday') !== window.day) return false

  const minutes = Number(part('hour')) * 60 + Number(part('minute'))
  const [h, m] = window.opens.split(':').map(Number)
  const opens = h * 60 + m
  return minutes >= opens - window.beforeMinutes && minutes < opens + window.afterMinutes
}
