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

  if (/tomorrow/.test(q) && /^(what|any|anything|how)/.test(q)) {
    const d = addDays(today, 1)
    if (leo) {
      const list = routinesOn(s, d)
      return list.length ? `${joinAnd(list.map((r) => `${r.name} at ${routineTime(r)}`))}.` : 'Nothing scheduled tomorrow.'
    }
    const list = tasksOn(s, d)
    return list.length ? `${list.map((t) => (t.startTime ? `${t.startTime} ${t.title}` : t.title)).join(', ')}.` : 'Nothing planned for tomorrow yet.'
  }
  if (/(finish|finished|complete|completed|done).*(week)|this week.*(finish|done)/.test(q)) {
    const monday = addDays(today, -weekday(today))
    if (leo) {
      let n = 0
      for (let d = monday; d <= today; d = addDays(d, 1)) n += s.routines.filter((r) => outcome(r, d, completionOf(s.completions, r.id, d)) === 'full').length
      return n ? `${n} routine${n === 1 ? '' : 's'} finished in full since Monday.` : 'Nothing finished in full yet this week.'
    }
    const done = s.tasks.filter((t) => t.completed && t.date && t.date >= monday && t.date <= today)
    return done.length ? `${done.length} task${done.length === 1 ? '' : 's'}: ${joinAnd(done.slice(0, 6).map((t) => t.title))}.` : 'Nothing ticked off yet this week.'
  }
  if (leo && /lighter|too much|easier|lighten/.test(q)) {
    const r = s.routines.find((x) => x.active && /evening/i.test(`${x.timeCategory} ${x.name}`)) ?? s.routines.find((x) => x.active)
    if (!r || r.steps.length < 2) return 'There’s not much to trim right now.'
    const last = r.steps[r.steps.length - 1]
    return `I can drop ${last.title} from ${r.name} and keep ${joinAnd(r.steps.slice(0, -1).map((x) => x.title))}. Open ${r.name} and tap Edit to do it.`
  }
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

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/**
 * "Move my 2pm to Friday": finds today's task at that time and the next date with that weekday.
 * Returns null when the message isn't a move.
 */
export function parseMove(text: string, s: Pick<DataState, 'tasks'>, today = logicalToday()): { taskId?: string; date?: string; reply: string } | null {
  const m = text.toLowerCase().match(/^move (?:my |the )?(\d{1,2})(?::(\d{2}))?\s*(am|pm)? to (\w+)/)
  if (!m) return null
  let h = Number(m[1])
  if (m[3] === 'pm' && h < 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  if (!m[3] && h < 8) h += 12
  const at = `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`
  const target = m[4]
  let date: string | undefined
  if (target === 'tomorrow') date = addDays(today, 1)
  const wd = DAY_NAMES.findIndex((d) => d.startsWith(target.slice(0, 3)))
  if (!date && wd >= 0) date = addDays(today, ((wd - weekday(today) + 7) % 7) || 7)
  if (!date) return { reply: 'Which day should it move to?' }
  const t = s.tasks.find((x) => x.date === today && x.startTime === at && !x.completed)
  if (!t) return { reply: `There’s nothing at ${looseTime(at)} today.` }
  return { taskId: t.id, date, reply: `Done. ${t.title} is now ${DAY_NAMES[weekday(date)][0].toUpperCase()}${DAY_NAMES[weekday(date)].slice(1)} at ${at}.` }
}
