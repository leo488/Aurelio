import type { Backend, Collection, CollectionName } from '../backend'

// Everything in localStorage, one key per collection. Used when no database is configured, and
// as the reference behaviour the database backend has to match.

const PREFIX = 'aurelio:v2:'

function read<T>(name: CollectionName): Record<string, T> {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + name) ?? '{}') as Record<string, T>
  } catch {
    return {}
  }
}

function write<T>(name: CollectionName, rows: Record<string, T>) {
  localStorage.setItem(PREFIX + name, JSON.stringify(rows))
}

const matches = <T,>(row: T, filter: Partial<T>) =>
  Object.entries(filter).every(([k, v]) => v === undefined || (row as Record<string, unknown>)[k] === v)

function collection<T extends { id: string }>(name: CollectionName): Collection<T> {
  return {
    async list(filter) {
      return Object.values(read<T>(name)).filter((r) => matches(r, filter))
    },
    async put(item) {
      const rows = read<T>(name)
      rows[item.id] = item
      write(name, rows)
    },
    async remove(id) {
      const rows = read<T>(name)
      delete rows[id]
      write(name, rows)
    },
  }
}

export const localBackend: Backend = {
  kind: 'local',
  profiles: collection('profiles'),
  routines: collection('routines'),
  completions: collection('completions'),
  tasks: collection('tasks'),
  notifications: collection('notifications'),
  activity: collection('activity'),
  settings: collection('settings'),
  statuses: collection('statuses'),
  goals: collection('goals'),
}

/** Write a whole dataset at once (demo seed, tests). */
export function replaceLocalData(data: Partial<Record<CollectionName, { id: string }[]>>) {
  for (const [name, rows] of Object.entries(data)) {
    write(name as CollectionName, Object.fromEntries((rows ?? []).map((r) => [r.id, r])))
  }
}

export const LOCAL_SEEDED = `${PREFIX}seeded`
