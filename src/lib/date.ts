// Dates are local ISO strings (YYYY-MM-DD). Weekdays are Monday-first: 0 = Mon … 6 = Sun.
// A day lasts until 4am the next morning, so late completions still count.

export const DAY_ROLLOVER_HOUR = 4

const pad = (n: number) => String(n).padStart(2, '0')

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const diffDays = (a: string, b: string) => Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000)

/** The date the user is living in: before 4am still counts as yesterday. */
export const logicalToday = (now = new Date()) => toISO(new Date(now.getTime() - DAY_ROLLOVER_HOUR * 3600000))

export const weekday = (iso: string) => (fromISO(iso).getDay() + 6) % 7

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

/** "TUE 17 SEPTEMBER" */
export const eyebrowDate = (iso: string) => {
  const d = fromISO(iso)
  return `${WEEKDAY_SHORT[weekday(iso)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`.toUpperCase()
}

/** "Thu 18 Sep" */
export const shortDate = (iso: string) => {
  const d = fromISO(iso)
  return `${WEEKDAY_SHORT[weekday(iso)]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** "September 17" */
export const monthDay = (iso: string) => {
  const d = fromISO(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** "24 August" */
export const dayMonth = (iso: string) => {
  const d = fromISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Today / Tomorrow / Yesterday / weekday name within a week / short date. */
export const relativeDay = (iso: string, today: string) => {
  const n = diffDays(iso, today)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n > 1 && n < 7) return WEEKDAY_LONG[weekday(iso)]
  return shortDate(iso)
}

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const hhmm = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

/** "06:30" → "6:30" (the design drops the leading zero on morning times). */
export const looseTime = (t: string) => t.replace(/^0(\d):/, '$1:')

export const nowMinutes = (now = new Date()) => now.getHours() * 60 + now.getMinutes()

export const clock = (now = new Date()) => looseTime(hhmm(nowMinutes(now)))

/** Time part of an ISO-ish datetime "2025-09-17T16:00". */
export const timeOf = (dt?: string) => (dt && dt.includes('T') ? dt.slice(11, 16) : undefined)
export const dateOf = (dt?: string) => (dt ? dt.slice(0, 10) : undefined)
export const dt = (date: string, time: string) => `${date}T${time}`

export const toDate = (dtStr: string) => {
  const d = fromISO(dtStr.slice(0, 10))
  const t = timeOf(dtStr)
  if (t) d.setHours(Number(t.slice(0, 2)), Number(t.slice(3, 5)))
  return d
}

/** Human list of weekdays: "Every day", "Weekdays", "Mon – Sat", "Mon, Wed, Fri", "Sundays". */
export const daysLabel = (days: number[]) => {
  const s = [...days].sort((a, b) => a - b)
  if (s.length === 7) return 'Every day'
  if (s.length === 0) return 'Never'
  if (s.length === 1) return `${WEEKDAY_LONG[s[0]]}s`
  if (s.join() === '0,1,2,3,4') return 'Weekdays'
  if (s.join() === '5,6') return 'Weekends'
  const contiguous = s.every((d, i) => i === 0 || d === s[i - 1] + 1)
  if (contiguous && s.length > 2) return `${WEEKDAY_SHORT[s[0]]} – ${WEEKDAY_SHORT[s[s.length - 1]]}`
  return s.map((d) => WEEKDAY_SHORT[d]).join(', ')
}

export const relativeAgo = (at: number, now = Date.now()) => {
  const min = Math.round((now - at) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
