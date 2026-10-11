import { PROFILES, partnerRole } from '../config'
import { completionFor, overdueTasks, routinesOn, routineTime, tasksOn } from '../data/select'
import type { DataState } from '../data/store'
import type { User } from '../data/types'
import { addDays, logicalToday, looseTime, minutesOf, nowMinutes, weekday } from './date'
import { stepLabel } from './labels'
import { leoStats, soniaStats } from './stats'
import { completionOf, outcome, stepsOn } from './streak'
import { joinAnd } from './words'

/** Answers Ori can give from local data. Returns null when the message is a request to add something. */
export function answer(text: string, s: DataState, me: User): string | null {
  const q = text.toLowerCase()
  const today = logicalToday()
  const leo = me.role === 'leo'

  if (/streak|in a row|how am i doing|performance/.test(q)) {
    if (leo) {
      if (!s.routines.length) return 'No streaks yet. Make a routine and I’ll start counting.'
      const st = leoStats(s, today)
      return `${st.current} days in a row, best is ${st.longest}. Today ${st.today.done} of ${st.today.total} routines are done, and this week you’re at ${st.weekly}%.`
    }
    const st = soniaStats(s, today)
    return `${st.today.done} of ${st.today.total} done today, ${st.weekly.done} this week. Your planning streak is ${st.streak} day${st.streak === 1 ? '' : 's'}.`
  }
  if (/miss|left|behind|overdue/.test(q)) {
    if (leo) {
      const left = routinesOn(s, today)
        .filter((r) => minutesOf(routineTime(r)) <= nowMinutes())
        .flatMap((r) => stepsOn(r, today).filter((st) => !completionFor(s, r, today)?.completedStepIds.includes(st.id)).map((st) => st.title))
      const y = addDays(today, -1)
      const yMissed = s.routines.filter((r) => ['missed', 'partial'].includes(outcome(r, y, completionOf(s.completions, r.id, y)))).map((r) => r.name)
      const a = left.length ? `Only ${joinAnd(left.slice(0, 4))} today.` : 'Nothing left from today so far.'
      return a + (yMissed.length ? ` Yesterday ${joinAnd(yMissed)} came up short.` : ' Nothing from yesterday.')
    }
    const overdue = overdueTasks(s, today)
    const left = tasksOn(s, today).filter((t) => !t.completed)
    return `${left.length ? `${left.length} left today: ${joinAnd(left.slice(0, 3).map((t) => t.title))}.` : 'Nothing left today.'}${overdue.length ? ` ${overdue.length} overdue, starting with ${overdue[0].title}.` : ''}`
  }
  if (/plan|week/.test(q)) {
    let count = 0
    const deadlines: string[] = []
    for (let i = 0; i < 7 - weekday(today); i++) {
      const d = addDays(today, i)
      count += tasksOn(s, d).filter((t) => !t.completed).length
      deadlines.push(...tasksOn(s, d).filter((t) => t.deadline && !t.completed).map((t) => t.title))
    }
    if (leo) {
      const n = Array.from({ length: 7 - weekday(today) }, (_, i) => routinesOn(s, addDays(today, i)).length).reduce((a, b) => a + b, 0)
      return n ? `${n} routine sessions left this week. Want a new one? Say “create a 20-minute evening routine”.` : 'Nothing scheduled this week yet.'
    }
    if (!count) return 'Your week is open. Tell me what’s coming and I’ll place it.'
    return `${count} task${count === 1 ? '' : 's'} left this week${deadlines.length ? `, including ${deadlines.length} deadline${deadlines.length === 1 ? '' : 's'}` : ''}.`
  }
  if (/see|data|privacy|private/.test(q)) {
    return `Only your own ${leo ? 'routines' : 'tasks and calendar'}. ${PROFILES[partnerRole(me.role)].name} sees your progress as a number, never the items.`
  }
  if (/^(hi|hey|hello|thanks|thank you)\b/.test(q)) return 'Here with you. Ask about your day, or tell me something to add.'
  if (/what.*(today|now)|next/.test(q)) {
    if (leo) {
      const r = routinesOn(s, today).find((x) => stepsOn(x, today).some((st) => !completionFor(s, x, today)?.completedStepIds.includes(st.id)))
      if (!r) return 'Every routine today is done. Nice.'
      const next = stepsOn(r, today).find((st) => !completionFor(s, r, today)?.completedStepIds.includes(st.id))!
      return `${r.name} at ${looseTime(routineTime(r))}. Next up is ${stepLabel(next).toLowerCase()}.`
    }
    const t = tasksOn(s, today).find((x) => !x.completed)
    return t ? `${t.title}${t.startTime ? ` at ${looseTime(t.startTime)}` : ''} is next.` : 'Everything on today is done. Nice.'
  }
  return null
}
