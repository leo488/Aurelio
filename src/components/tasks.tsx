import { hhmm } from '../lib/date'
import { capitalize } from '../lib/words'

/** "Call Mum 18:00", "Send proposal at 11:30", "Gym at 6pm" → title and time. */
export function parseQuickTask(text: string): { title: string; startTime?: string } {
  const s = text.trim()
  const m = s.match(/^(.*?)\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (m && m[1] && (m[3] || m[4] || /\bat\s+\d/i.test(s))) {
    let h = Number(m[2])
    const min = Number(m[3] ?? 0)
    const ampm = m[4]?.toLowerCase()
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    if (h < 24 && min < 60) return { title: capitalize(m[1].trim()), startTime: hhmm(h * 60 + min) }
  }
  return { title: capitalize(s) }
}
