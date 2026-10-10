import { addDays, diffDays, dt, hhmm, minutesOf, nowMinutes, weekday, WEEKDAY_LONG } from './date'
import { capitalize, joinAnd } from './words'

export type OriItemType = 'event' | 'task' | 'deadline' | 'routineEdit'

export interface OriItem {
  type: OriItemType
  title: string
  start?: string
  end?: string
  due?: string
  remindAt?: string
  assumption?: string
  routineId?: string
  time?: string
}

export interface OriContext {
  today: string
  now: Date
  routines: { id: string; name: string }[]
  names: string[]
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
}
const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const T = String.raw`(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?`

/**
 * Turn a request into structured items. With VITE_ORI_ENDPOINT set, the transcript goes to that
 * server-side LLM endpoint (never ship API keys in the PWA); otherwise, or if it fails, a local
 * rule-based parser handles the common shapes so Ori works offline.
 */
export async function parseRequest(transcript: string, ctx: OriContext): Promise<OriItem[]> {
  const endpoint = import.meta.env.VITE_ORI_ENDPOINT as string | undefined
  if (endpoint && navigator.onLine) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, now: ctx.now.toISOString(), today: ctx.today, routines: ctx.routines }),
      })
      if (res.ok) {
        const json = (await res.json()) as { items?: OriItem[] }
        if (Array.isArray(json.items)) return json.items
      }
    } catch {
      /* fall back to the local parser */
    }
  }
  return parseLocal(transcript, ctx)
}

function toMinutes(h: number, m: number, ampm: string | undefined, assume: (s: string) => void, raw: string) {
  let hour = h
  const mer = ampm?.replace(/\./g, '')
  if (mer === 'pm' && hour < 12) hour += 12
  else if (mer === 'am' && hour === 12) hour = 0
  else if (!mer && hour >= 1 && hour <= 7) {
    hour += 12
    assume(`I took “${raw}” as ${hhmm(hour * 60 + m)}.`)
  }
  return hour * 60 + m
}

export function parseLocal(text: string, ctx: OriContext): OriItem[] {
  const original = text.trim().replace(/[‘’]/g, "'").replace(/[“”"…]+/g, '').replace(/\s+/g, ' ')
  let s = ` ${original.toLowerCase()} `
  s = s.replace(/\b(noon|midday)\b/g, '12pm').replace(/\bmidnight\b/g, '11:59pm')
  s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b(?=\s*(?:am|pm|o'?clock|to|until|till|-|and|,|\.|$| ))/g, (w) => String(NUMBER_WORDS[w]))
  s = s.replace(/o'?clock/g, '')

  // A small routine edit: "move morning to 7".
  const edit = s.match(new RegExp(String.raw`\b(?:move|shift|push|change)\s+(?:my\s+)?(\w+)(?:\s+routine)?\s+to\s+${T}`))
  if (edit) {
    const r = ctx.routines.find((x) => x.name.toLowerCase() === edit[1])
    if (r) {
      const mins = toMinutes(Number(edit[2]), Number(edit[3] ?? 0), edit[4], () => undefined, edit[0])
      const time = hhmm(mins)
      return [{ type: 'routineEdit', routineId: r.id, time, title: `${r.name} starts at ${time.replace(/^0/, '')}` }]
    }
  }

  const clauses = s.split(/\s*(?:,|;|\.(?!\d)|\band then\b|\band also\b|\band\b|\bthen\b|\balso\b|\bplus\b)\s*/).map((c) => c.trim()).filter(Boolean)
  const items: OriItem[] = []
  let lastDay: string | null = null
  let lastNoun: string | null = null

  for (const clause of clauses) {
    const notes: string[] = []
    const assume = (n: string) => notes.push(n)

    let day: string | null = null
    if (/\b(today|tonight|this evening|this morning)\b/.test(clause)) day = ctx.today
    else if (/\btomorrow\b/.test(clause)) day = addDays(ctx.today, 1)
    else if (/\bnext week\b/.test(clause)) day = addDays(ctx.today, 7 - weekday(ctx.today))
    else {
      const m = clause.match(/\b(?:on |by |this |next )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/)
      if (m) {
        const target = DAY_NAMES.indexOf(m[1])
        day = addDays(ctx.today, ((target - weekday(ctx.today) + 7) % 7) || 7)
      }
    }

    let start: number | null = null
    let end: number | null = null
    const range = clause.match(new RegExp(String.raw`\bfrom\s+${T}\s*(?:to|until|till|-)\s*${T}`))
    if (range) {
      start = toMinutes(Number(range[1]), Number(range[2] ?? 0), range[3] ?? range[6], () => undefined, range[1])
      end = toMinutes(Number(range[4]), Number(range[5] ?? 0), range[6], () => undefined, range[4])
      if (start < 8 * 60 && !range[3] && !range[6]) start += 12 * 60
      while (end <= start) end += 12 * 60
    } else {
      const at = clause.match(new RegExp(String.raw`\b(?:at|around|by)\s+${T}`)) ?? clause.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/) ?? clause.match(/\b(\d{1,2}):(\d{2})()/)
      if (at) start = toMinutes(Number(at[1]), Number(at[2] ?? 0), at[3] || undefined, assume, at[0].replace(/^(at|around|by)\s+/, ''))
    }

    const isDeadline = /\b(due|deadline|submit by|hand in by|has to be in)\b/.test(clause)
    const isReminder = /\bremind me\b/.test(clause)
    const isEvent = !isDeadline && !isReminder && (range !== null || /\b(class|lecture|meeting|lunch|dinner|breakfast|appointment|call with|party|session|standup|seminar|exam|gym class|date)\b/.test(clause))

    let title = clause
      .replace(new RegExp(String.raw`\bfrom\s+${T}\s*(?:to|until|till|-)\s*${T}`), ' ')
      .replace(new RegExp(String.raw`\b(?:at|around|by)\s+${T}`), ' ')
      .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)/g, ' ')
      .replace(/\b(today|tonight|this evening|this morning|tomorrow|next week)\b/g, ' ')
      .replace(/\b(?:on |by |this |next )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/g, ' ')
      .replace(/^(hey ori|ori|ok|okay|so|um|uh)\b/g, ' ')
      .replace(/\b(remind me (?:to )?|i need to|i have to|i've got to|i gotta|i should|please|can you|add (?:a |an )?|put (?:a |an )?|schedule (?:a |an )?)/g, ' ')
      .replace(/\b(i have|i've got|i got|there's|there is|we have|it's|it is|that's|that is)\b/g, ' ')
      .replace(/\b(due|deadline)\b/g, ' ')
      .replace(/\bmy\b/g, ' ')
      .replace(/\b(the|a|an|is|for|to|on|in|at)\s*$/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(the|a|an|to|is)\s+/, '')
      .replace(/\s+(the|a|an|is|for|to|on|in|at)$/, '')

    if (!title && !isDeadline) continue
    if (isDeadline && (!title || /^(it|that|this)$/.test(title))) {
      title = lastNoun ? `${lastNoun} due` : 'Deadline'
      if (lastNoun) assume(`I read “it” as the ${lastNoun} you mentioned.`)
    } else if (isDeadline) {
      title = `${title} due`
    }
    title = capitalize(title).replace(new RegExp(String.raw`\b(${ctx.names.join('|')})\b`, 'gi'), (n) => capitalize(n.toLowerCase()))
    const words = title.replace(/ due$/, '').split(' ')
    lastNoun = words[words.length - 1]?.toLowerCase() || lastNoun

    if (!day) {
      if (lastDay) day = lastDay
      else if (start !== null && start < nowMinutes(ctx.now) && !isDeadline) {
        day = addDays(ctx.today, 1)
        assume(`${hhmm(start)} has passed today, so I put it on ${WEEKDAY_LONG[weekday(day)]}.`)
      } else day = ctx.today
    }
    lastDay = day

    if (isEvent) {
      const st = start ?? 9 * 60
      if (start === null) assume('No time given, so I put it at 09:00.')
      items.push({ type: 'event', title, start: dt(day, hhmm(st)), end: dt(day, hhmm(end ?? st + 60)), assumption: notes[0] })
    } else if (isDeadline) {
      const due = dt(day, hhmm(start ?? 23 * 60 + 59))
      const warn = diffDays(day, ctx.today) >= 2 ? addDays(day, -2) : day
      items.push({ type: 'deadline', title, due, remindAt: dt(warn, '09:00'), assumption: notes[0] })
    } else {
      const due = start !== null ? dt(day, hhmm(start)) : clause.match(/\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/) ? day : undefined
      items.push({ type: 'task', title, due, remindAt: isReminder && start !== null ? dt(day, hhmm(start)) : undefined, assumption: notes[0] })
    }
  }
  return items
}

export const typeLabel = (i: OriItem) =>
  i.type === 'event' ? 'EVENT' : i.type === 'deadline' ? 'DEADLINE' : i.type === 'routineEdit' ? 'ROUTINE' : i.remindAt ? 'TASK · REMINDER' : 'TASK'

export const typeColor = (i: OriItem) =>
  i.type === 'event' ? '#8A7E9B' : i.type === 'deadline' ? '#B4674A' : '#C79A4A'

/** "A class, a reminder and a deadline" */
export const summarize = (items: OriItem[]) =>
  capitalize(joinAnd(items.map((i) => {
    if (i.type === 'event') return /class|lecture/i.test(i.title) ? 'a class' : 'an event'
    if (i.type === 'deadline') return 'a deadline'
    if (i.type === 'routineEdit') return 'a routine change'
    return i.remindAt ? 'a reminder' : 'a task'
  })))

export const minutesBetween = (a: string, b: string) => minutesOf(b.slice(11, 16)) - minutesOf(a.slice(11, 16))
