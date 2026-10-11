import { useEffect, useRef } from 'react'
import { matchPath, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../data/session'
import { dayProgress } from '../data/select'
import { useData } from '../data/store'
import type { Role } from '../data/types'
import { logicalToday } from '../lib/date'
import { useReminders } from '../lib/reminders'
import { soniaStats } from '../lib/stats'
import { dayStreak } from '../lib/streak'
import { BottomBar, type Tab } from './BottomBar'
import { Toast } from './Toast'

const HIDE_BAR = ['/', '/run', '/run/done', '/ori', '/ori/chat', '/milestone', '/routines/new', '/tasks/new', '/tasks/:id']
const DARK = ['/run', '/run/done', '/ori', '/milestone']

const TAB_FOR: [string, Tab][] = [
  ['/today', 'today'], ['/welcome', 'today'], ['/missed', 'today'],
  ['/routines', 'routines'], ['/routines/:id', 'routines'],
  ['/profile', 'progress'], ['/streak', 'progress'], ['/settings', 'progress'],
  ['/calendar', 'calendar'], ['/calendar/:day', 'calendar'], ['/tasks', 'tasks'],
  ['/together', 'together'],
]

/** Publish today's numbers (never the items) so the other person's Together screen can show them. */
function useStatusPublisher() {
  const last = useRef('')
  const me = useData((s) => s.me)
  const ready = useData((s) => s.status === 'ready')
  const routines = useData((s) => s.routines)
  const completions = useData((s) => s.completions)
  const tasks = useData((s) => s.tasks)
  useEffect(() => {
    if (!me || !ready) return
    const date = logicalToday()
    const status = me.role === 'leo'
      ? (() => {
          const p = dayProgress({ routines, completions }, date)
          return { date, done: p.done, total: p.total, unit: 'routines' as const, streak: dayStreak(routines, completions, date).current }
        })()
      : (() => {
          const st = soniaStats({ tasks }, date)
          return { date, done: st.today.done, total: st.today.total, unit: 'tasks' as const, streak: st.streak }
        })()
    const key = JSON.stringify(status)
    if (key === last.current) return
    const t = setTimeout(() => {
      last.current = key
      useData.getState().publishStatus(status)
    }, 800)
    return () => clearTimeout(t)
  }, [me, ready, routines, completions, tasks])
}

export function Layout() {
  const { pathname } = useLocation()
  const session = useAuth((s) => s.session)
  const status = useData((s) => s.status)
  const me = useData((s) => s.me)
  useReminders(me)
  useStatusPublisher()

  const dark = DARK.includes(pathname)
  useEffect(() => {
    // The status bar takes the colour of the screen under it, read from the theme tokens.
    const token = getComputedStyle(document.documentElement).getPropertyValue(dark ? '--ink-dark-bg' : '--paper').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', token)
    document.documentElement.style.background = dark ? 'var(--ink-dark-bg)' : ''
  }, [dark])

  useEffect(() => window.scrollTo(0, 0), [pathname])

  if (pathname === '/') return <><Outlet /><Toast withBar={false} /></>
  if (!session) return <Navigate to="/" replace />
  if (status === 'error') {
    return (
      <main className="screen no-bar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <div className="display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Couldn’t load your day</div>
        <div style={{ fontSize: 14, color: 'var(--muted-2)', marginTop: 8 }}>Check your connection and try again.</div>
        <button type="button" className="btn btn-ink" style={{ marginTop: 22 }} onClick={() => void useData.getState().load(session.user)}>Try again</button>
      </main>
    )
  }
  // Data comes from the device straight away in local mode; the paper background covers the short wait otherwise.
  if (status !== 'ready' || !me) return <main className="screen no-bar" aria-busy="true" />

  const showBar = !HIDE_BAR.some((p) => matchPath(p, pathname))
  const tab = TAB_FOR.find(([p]) => matchPath(p, pathname))?.[1] ?? null
  return (
    <>
      <Outlet />
      {showBar && <BottomBar role={me.role} active={tab} />}
      <Toast withBar={showBar} />
    </>
  )
}

/** Keeps each experience to its owner: Sonia never lands on Leo's routine screens and vice versa. */
export function Only({ role, children }: { role: Role; children: React.ReactNode }) {
  const me = useData((s) => s.me)
  if (me && me.role !== role) return <Navigate to="/today" replace />
  return <>{children}</>
}
