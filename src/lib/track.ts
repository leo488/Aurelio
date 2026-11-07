import type { TrackCheck, TrackItem, TrackSlot } from '../data/types'
import { addDays, diffDays, mondayOf, weekKey, weekStart } from './date'

// Leo's weekly tracker. One list per week, the same every day of it; a day counts for however
// much of it was ticked, so a quarter-done day still shows up instead of looking like a miss.

export const SLOTS: [TrackSlot, string][] = [['morning', 'Morning'], ['day', 'During the day'], ['evening', 'Evening']]

/** The starter list, made once on Leo's first visit. Deterministic ids so a retry can't duplicate it. */
export const STARTER: [string, TrackSlot, string][] = [
  ['morning-prayer', 'morning', 'Morning prayer'],
  ['study-word', 'morning', 'Study the Word'],
  ['brush-am', 'morning', 'Brush my teeth'],
  ['pray-30', 'day', 'Pray for 30 minutes'],
  ['sermon', 'day', 'Listen to a sermon'],
  ['project', 'day', 'Work on this week’s project'],
  ['learn', 'day', 'Learn something new'],
  ['evening-prayer', 'evening', 'Evening prayer'],
  ['journal', 'evening', 'Write in my journal'],
  ['brush-pm', 'evening', 'Brush my teeth'],
]

export const checkId = (itemId: string, date: string) => `${itemId}|${date}`

/** The items on a week's list, in slot then position order. */
export function itemsForWeek(items: TrackItem[], key: string): TrackItem[] {
  const slot = (s: TrackSlot) => SLOTS.findIndex(([k]) => k === s)
  return items
    .filter((i) => i.startWeek <= key && (!i.endWeek || key <= i.endWeek))
    .sort((a, b) => slot(a.slot) - slot(b.slot) || a.position - b.position || a.createdAt.localeCompare(b.createdAt))
}

/** A week's list as Leo sees it: the items, and each item's sub to-dos in order. */
export function weekList(items: TrackItem[], key: string) {
  const all = itemsForWeek(items, key)
  const top = all.filter((i) => !i.parentId)
  const ids = new Set(top.map((i) => i.id))
  const subs = new Map<string, TrackItem[]>()
  for (const i of all) if (i.parentId && ids.has(i.parentId)) subs.set(i.parentId, [...(subs.get(i.parentId) ?? []), i])
  return { top, subs }
}

export type Checked = Set<string>
export const checkedSet = (checks: TrackCheck[]): Checked => new Set(checks.map((c) => c.id))

/** How much of a day's list was ticked. */
export function dayScore(items: TrackItem[], checked: Checked, date: string) {
  // Sub to-dos are steps of their item; the item counts once.
  const list = itemsForWeek(items, weekKey(date)).filter((i) => !i.parentId)
  const done = list.filter((i) => checked.has(checkId(i.id, date))).length
  return { done, total: list.length, pct: list.length ? done / list.length : 0 }
}

/** 0 nothing, 1 a little, 2 about half, 3 most, 4 all of it. */
export function level(done: number, total: number): 0 | 1 | 2 | 3 | 4 {
  if (!total || !done) return 0
  if (done >= total) return 4
  const p = done / total
  return p < 0.34 ? 1 : p < 0.67 ? 2 : 3
}

/** The first week Leo tracked: week 1. */
export function firstWeek(items: TrackItem[], today: string): string {
  return items.reduce((min, i) => (i.startWeek < min ? i.startWeek : min), weekKey(today))
}

/** "Week 3" counting from the first tracked week. */
export const trackWeekNumber = (first: string, key: string) => Math.floor(diffDays(mondayOf(key), mondayOf(first)) / 7) + 1

/**
 * Days in a row with anything ticked. Today only adds to the run once something is ticked,
 * and never breaks it before the day is over.
 */
export function trackStreak(items: TrackItem[], checked: Checked, today: string, first = firstWeek(items, today)) {
  const start = mondayOf(first)
  const did = (d: string) => dayScore(items, checked, d).done > 0
  let current = 0
  for (let d = did(today) ? today : addDays(today, -1); d >= start && did(d); d = addDays(d, -1)) current++
  let longest = 0
  let run = 0
  let days = 0
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (did(d)) {
      run++
      days++
      longest = Math.max(longest, run)
    } else if (d !== today) run = 0
  }
  return { current, longest, days }
}

/** A week at a glance: each day's score and the week's share ticked. Future days don't count. */
export function weekSummary(items: TrackItem[], checked: Checked, key: string, today: string) {
  const monday = mondayOf(key)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    return { date, future: date > today, ...dayScore(items, checked, date) }
  })
  const past = days.filter((d) => !d.future)
  const done = past.reduce((n, d) => n + d.done, 0)
  const total = past.reduce((n, d) => n + d.total, 0)
  return { key, monday, days, done, total, pct: total ? done / total : 0 }
}

/** Every tracked week from the first to this one, newest first. */
export function trackedWeeks(items: TrackItem[], today: string) {
  const out: string[] = []
  for (let m = mondayOf(firstWeek(items, today)); m <= today; m = addDays(m, 7)) out.push(weekKey(m))
  return out.reverse()
}

export const thisMonday = (today: string) => weekStart(today)
