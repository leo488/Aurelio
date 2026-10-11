// Domain models. These are what the UI, the store and every backend agree on;
// backends map them to their own storage (see src/services).
//
// Dates are local ISO dates ("2026-10-12"), times are "HH:MM", weekdays are Monday-first (0 = Mon … 6 = Sun).

/** The two fixed profiles. A role decides which experience someone gets. */
export type Role = 'leo' | 'sonia'

export interface User {
  /** Backend id: the role in local mode, the auth user id once a database is connected. */
  id: string
  email: string
  name: string
  role: Role
}

// ─── Leo: routines ────────────────────────────────────────────────────────────

export type TimeCategory = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom'

export type RoutineIcon = 'sun' | 'moon' | 'dumbbell' | 'book'

/** When a routine is due. Weekly days covers every day, weekdays, gym days and so on. */
export type RepeatPattern = { type: 'weekly'; days: number[] }

/** A repeat pattern that applied to every date before `until`. Kept so schedule changes never rewrite past streaks. */
export interface PastSchedule { until: string; days: number[] }

export interface ReminderSettings {
  enabled: boolean
  /** How long before the scheduled time to remind. */
  minutesBefore: number
}

export interface RoutineStep {
  id: string
  title: string
  /** Minutes. */
  duration?: number
  /** Weekdays this step applies on; always a subset of the routine's repeat days. */
  days: number[]
  /** Steps that shouldn't decide the day can be switched off. */
  countsTowardStreak: boolean
}

export interface Routine {
  id: string
  userId: string
  name: string
  description?: string
  icon: RoutineIcon
  timeCategory: TimeCategory
  /** Shown when timeCategory is "custom", e.g. "Before class". */
  categoryLabel?: string
  scheduledTime?: string
  repeatPattern: RepeatPattern
  scheduleHistory?: PastSchedule[]
  /** Ordered; array position is the step order. */
  steps: RoutineStep[]
  reminder: ReminderSettings
  active: boolean
  /** Periods the routine was switched off. Those days never touch the streak. */
  inactiveRanges?: { from: string; to?: string }[]
  createdAt: string
  updatedAt: string
}

/**
 * One routine on one scheduled day: which steps were done. Streaks and statistics are
 * calculated from these records and nothing else.
 */
export interface RoutineCompletion {
  /** `${routineId}|${date}` so a day is written once however often it changes. */
  id: string
  routineId: string
  userId: string
  date: string
  completedStepIds: string[]
  /**
   * The counted steps as they were on that day. Editing a routine later never rewrites
   * history: adding a step doesn't turn yesterday's full day into a partial one.
   */
  requiredStepIds?: string[]
  skippedStepIds?: string[]
  /** The whole day was skipped on purpose (two a week); neutral for the streak. */
  skipped?: boolean
  /** Filled in after the fact from the missed-day screen. */
  backfilled?: boolean
  startedAt?: string
  /** Set when every counted step is done. */
  completedAt?: string
  updatedAt: string
}

// ─── Sonia: tasks and calendar ───────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  userId: string
  title: string
  notes?: string
  /** No date means "someday". */
  date?: string
  startTime?: string
  endTime?: string
  priority: Priority
  /** Shows in red and warns two days out. */
  deadline?: boolean
  completed: boolean
  completedAt?: string
  /** Local date-time "2026-10-12T08:45". */
  reminderAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Reminders, notifications and the shared layer ────────────────────────────

export interface Settings {
  /** Same as userId: one row per person. */
  id: string
  userId: string
  notif: {
    /** Routine start reminders (Leo) or task reminders (Sonia). */
    reminders: boolean
    deadlines: boolean
    partner: boolean
    quiet: { on: boolean; from: string; to: string }
  }
  oriConfirm: boolean
  updatedAt: string
}

export type NotificationKind = 'routine' | 'task' | 'deadline' | 'catchup' | 'partner' | 'nudge'
export type NotificationStatus = 'scheduled' | 'sent' | 'read'

/**
 * A notification attached to the record it is about. Reminders the app works out itself are
 * written here when they fire; nudges from the other person are written here ahead of time
 * with status "scheduled".
 */
export interface AppNotification {
  id: string
  /** Who receives it. */
  userId: string
  kind: NotificationKind
  title: string
  body?: string
  refType?: 'routine' | 'task' | 'nudge'
  refId?: string
  /** When it should appear (ISO timestamp). */
  scheduledFor: string
  status: NotificationStatus
  fromUserId?: string
  createdAt: string
}

export type ActivityKind = 'routine-done' | 'streak' | 'day-planned' | 'day-done' | 'cheer' | 'nudge'

/** What the other person can see happened. Never carries item details. */
export interface Activity {
  id: string
  userId: string
  kind: ActivityKind
  text: string
  value?: number
  cheeredBy?: string
  createdAt: string
}

/** Today's progress as a number, published so the other person can see it without seeing the items. */
export interface DailyStatus {
  /** `${userId}|${date}` */
  id: string
  userId: string
  date: string
  done: number
  total: number
  /** "routines" or "tasks" */
  unit: 'routines' | 'tasks'
  streak: number
  updatedAt: string
}
