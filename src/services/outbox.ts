import type { Backend, Collection, CollectionName } from './backend'

// Writes that couldn't reach the database (offline, flaky signal) wait here and are replayed in
// order when the connection comes back. Every write is an idempotent upsert or delete by id,
// so replaying is always safe; a later write to the same record replaces an earlier one.

export class NetworkError extends Error {}

type Op = { name: CollectionName; kind: 'put'; item: { id: string } } | { name: CollectionName; kind: 'remove'; id: string }

const KEY = 'aurelio:outbox'
const opKey = (o: Op) => `${o.name}:${o.kind === 'put' ? o.item.id : o.id}`

const load = (): Op[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Op[]
  } catch {
    return []
  }
}
const save = (ops: Op[]) => localStorage.setItem(KEY, JSON.stringify(ops))

const listeners = new Set<(pending: number) => void>()
const notify = () => listeners.forEach((l) => l(load().length))
export const onOutboxChange = (fn: (pending: number) => void) => (listeners.add(fn), () => listeners.delete(fn))
export const pendingWrites = () => load().length

function enqueue(op: Op) {
  const ops = load().filter((o) => opKey(o) !== opKey(op))
  ops.push(op)
  save(ops)
  notify()
}

export function withOutbox(inner: Backend): Backend & { flush: () => Promise<void> } {
  const run = (op: Op) => {
    const c = inner[op.name] as Collection<{ id: string }>
    return op.kind === 'put' ? c.put(op.item) : c.remove(op.id)
  }

  let flushing: Promise<void> | null = null
  const flush = () =>
    (flushing ??= (async () => {
      try {
        for (const op of load()) {
          try {
            await run(op)
          } catch (e) {
            if (e instanceof NetworkError) return
            console.error('Dropped a write the database refused', op, e)
          }
          save(load().filter((o) => opKey(o) !== opKey(op)))
          notify()
        }
      } finally {
        flushing = null
      }
    })())

  const wrap = <T extends { id: string }>(name: CollectionName): Collection<T> => {
    const c = inner[name] as unknown as Collection<T>
    const attempt = async (op: Op) => {
      // Keep order: if anything is already waiting, queue behind it.
      if (load().length) return enqueue(op)
      try {
        await run(op)
      } catch (e) {
        if (e instanceof NetworkError) enqueue(op)
        else throw e
      }
    }
    return {
      list: (filter) => c.list(filter),
      put: (item) => attempt({ name, kind: 'put', item }),
      remove: (id) => attempt({ name, kind: 'remove', id }),
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void flush())
    setInterval(() => navigator.onLine && load().length && void flush(), 30_000)
  }

  return {
    kind: inner.kind,
    flush,
    profiles: wrap('profiles'),
    routines: wrap('routines'),
    completions: wrap('completions'),
    tasks: wrap('tasks'),
    notifications: wrap('notifications'),
    activity: wrap('activity'),
    settings: wrap('settings'),
    statuses: wrap('statuses'),
  }
}
