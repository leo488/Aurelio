import { displayName, partnerOf } from '../data/session'
import { eventsOn, logOf, myRoutines, routinesOn, tasksOn } from '../data/select'
import type { DataState } from '../data/store'
import type { User } from '../data/types'
import { addDays, logicalToday, looseTime, minutesOf, nowMinutes, weekday } from './date'
import { itemLabel, routinePlural } from './labels'
import { itemsOn, liveStreak, logKey, outcome } from './streak'
import { joinAnd } from './words'

/** Answers Ori can give from local data. Returns null when the message is a request to add something. */
export function answer(text: string, s: DataState, me: User): string | null {
  const q = text.toLowerCase()
  const today = logicalToday()
  const mine = myRoutines(s, me).filter((r) => r.owner === me && !r.paused)

  if (/streak|in a row|how am i doing/.test(q)) {
    const r = mine[0]
    if (!r) return 'No streaks yet. Make a routine and I’ll start counting.'
    const n = liveStreak(r, today, logOf(s, r))
    const next = routinesOn(s, me, today).find((x) => x.id !== r.id && minutesOf(x.time) > nowMinutes())
    return `${n} ${routinePlural(r.name)}, best is ${Math.max(n, r.streak.longest)}.${next ? ` ${next.name} is at ${looseTime(next.time)}.` : ''}`
  }
  if (/miss|left|behind/.test(q)) {
    const left = routinesOn(s, me, today)
      .filter((r) => r.owner === me && minutesOf(r.time) <= nowMinutes())
      .flatMap((r) => itemsOn(r, today).filter((i) => !logOf(s, r)?.doneItemIds.includes(i.id)).map((i) => i.name))
    const y = addDays(today, -1)
    const yMissed = mine.filter((r) => ['missed', 'partial'].includes(outcome(r, y, s.logs[logKey(y, r.id)]))).map((r) => r.name)
    const a = left.length ? `Only ${joinAnd(left.slice(0, 4))} today.` : 'Nothing left from today so far.'
    const b = yMissed.length ? ` Yesterday ${joinAnd(yMissed)} came up short.` : ' Nothing from yesterday.'
    return a + b
  }
  if (/plan|week/.test(q)) {
    let events = 0
    const deadlines: string[] = []
    for (let i = 0; i < 7 - weekday(today); i++) {
      const d = addDays(today, i)
      events += eventsOn(s, me, d).length
      deadlines.push(...tasksOn(s, me, d).filter((t) => t.isDeadline && !t.done).map((t) => t.title))
    }
    if (!events && !deadlines.length) return 'Your week is open. Tell me what’s coming and I’ll place it.'
    return `${events} event${events === 1 ? '' : 's'} and ${deadlines.length} deadline${deadlines.length === 1 ? '' : 's'} left this week.${deadlines[0] ? ` Want me to block time for “${deadlines[0]}” around your classes?` : ''}`
  }
  if (/see|data|privacy|private/.test(q)) {
    return `Only your own routines, tasks and calendar. ${displayName[partnerOf(me)]} sees your progress as a number, never the items.`
  }
  if (/^(hi|hey|hello|thanks|thank you)\b/.test(q)) return 'Here with you. Ask about your day, or tell me something to add.'
  if (/what.*(today|now)|next/.test(q)) {
    const r = routinesOn(s, me, today).find((x) => itemsOn(x, today).some((i) => !logOf(s, x)?.doneItemIds.includes(i.id)))
    if (!r) return 'Everything on today is done. Nice.'
    const nextItem = itemsOn(r, today).find((i) => !logOf(s, r)?.doneItemIds.includes(i.id))!
    return `${r.name} at ${looseTime(r.time)}. Next up is ${itemLabel(nextItem).toLowerCase()}.`
  }
  return null
}
