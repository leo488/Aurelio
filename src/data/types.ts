export type User = 'leo' | 'soniya'
/** Shared things belong to the household rather than one person. */
export type Owner = User | 'both'

export type RoutineIcon = 'sun' | 'moon' | 'dumbbell' | 'book'

export interface RoutineItem {
  id: string
  name: string
  durationMin?: number
  /** Monday-first weekdays this item applies on. */
  days: number[]
  countsTowardStreak: boolean
  /** The partner does this one too (shows their avatar). */
  shared?: boolean
}

export interface StreakState {
  current: number
  longest: number
  lastBreak?: { value: number; date: string; done: number; total: number; backfilled?: boolean }
}

export interface Routine {
  id: string
  owner: Owner
  name: string
  icon: RoutineIcon
  /** "06:30" */
  time: string
  days: number[]
  items: RoutineItem[]
  remind: boolean
  sharedWith?: User
  paused: boolean
  streak: StreakState
  createdAt: string
}

export interface DayLog {
  date: string
  routineId: string
  doneItemIds: string[]
  skippedItemIds?: string[]
  skipped?: boolean
  backfilled?: boolean
  startedAt?: number
  finishedAt?: number
}

export type Priority = 'low' | 'med' | 'high'

export interface Task {
  id: string
  owner: Owner
  title: string
  notes?: string
  /** "2025-09-19" or "2025-09-19T23:59" */
  due?: string
  isDeadline: boolean
  remindAt?: string
  priority: Priority
  shared: boolean
  assignee?: User
  durationMin?: number
  done: boolean
  doneAt?: number
}

export interface CalEvent {
  id: string
  owner: Owner
  title: string
  /** "2025-09-17T09:00" */
  start: string
  end: string
  location?: string
  shared?: boolean
}

export interface Settings {
  notif: {
    routineStart: boolean
    deadlines: boolean
    partner: boolean
    quiet: { on: boolean; from: string; to: string }
  }
  oriConfirm: boolean
}

export interface Activity {
  id: string
  who: User
  kind: 'routine-done' | 'streak' | 'cheer' | 'shared'
  text: string
  at: number
  routineId?: string
  value?: number
  cheeredBy?: User
}

export type NoticeKind = 'routine' | 'deadline' | 'partner' | 'catchup'

export interface Notice {
  id: string
  kind: NoticeKind
  title: string
  meta: string
  at: number
  read: boolean
  taskId?: string
  opened?: boolean
}
