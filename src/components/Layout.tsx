import { useEffect } from 'react'
import { matchPath, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useData } from '../data/store'
import { useSession } from '../data/session'
import { useReminders } from '../lib/reminders'
import { BottomBar, type Tab } from './BottomBar'
import { Toast } from './Toast'

const HIDE_BAR = ['/', '/run', '/run/done', '/ori', '/ori/chat', '/milestone', '/routines/new', '/tasks/new']
const DARK = ['/run', '/run/done', '/ori', '/milestone']

const TAB_FOR: [string, Tab][] = [
  ['/today', 'today'], ['/welcome', 'today'],
  ['/routines', 'routines'], ['/routines/:id', 'routines'],
  ['/calendar', 'calendar'], ['/calendar/:day', 'calendar'], ['/tasks', 'calendar'],
  ['/together', 'together'], ['/streak', 'together'], ['/settings', 'together'],
]

export function Layout() {
  const { pathname } = useLocation()
  const user = useSession((s) => s.user)
  const settleDays = useData((s) => s.settleDays)
  useReminders(user)

  // Close out finished days on launch, when the app comes back to the foreground, and every few minutes.
  useEffect(() => {
    settleDays()
    const onVisible = () => document.visibilityState === 'visible' && settleDays()
    document.addEventListener('visibilitychange', onVisible)
    const t = setInterval(settleDays, 5 * 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(t)
    }
  }, [settleDays])

  const dark = DARK.includes(pathname)
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17150F' : '#F6F1E9')
    document.documentElement.style.background = dark ? '#17150F' : ''
  }, [dark])

  useEffect(() => window.scrollTo(0, 0), [pathname])

  if (!user && pathname !== '/') return <Navigate to="/" replace />

  const showBar = !HIDE_BAR.includes(pathname)
  const tab = TAB_FOR.find(([p]) => matchPath(p, pathname))?.[1] ?? null
  return (
    <>
      <Outlet />
      {showBar && <BottomBar active={tab} />}
      <Toast withBar={showBar} />
    </>
  )
}
