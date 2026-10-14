import { NavLink, useNavigate } from 'react-router-dom'
import type { Role } from '../data/types'
import { Icon, type IconName } from './Icon'
import { Ori } from './Ori'

export type Tab = 'today' | 'week' | 'routines' | 'streaks' | 'calendar' | 'upcoming' | 'you' | null

type TabDef = { tab: Exclude<Tab, null>; to: string; icon: IconName; label: string }

const TODAY: TabDef = { tab: 'today', to: '/today', icon: 'sun', label: 'Today' }
const YOU: TabDef = { tab: 'you', to: '/profile', icon: 'user', label: 'You' }

/** Leo's bar is built around routines and his week, Soniya's around her plan. Ori sits after the first two tabs. */
export const TABS: Record<Role, TabDef[]> = {
  leo: [TODAY, { tab: 'week', to: '/week', icon: 'calendar', label: 'Week' }, { tab: 'routines', to: '/routines', icon: 'list', label: 'Routines' }, { tab: 'streaks', to: '/streak', icon: 'flame', label: 'Streaks' }, YOU],
  sonia: [TODAY, { tab: 'calendar', to: '/calendar', icon: 'calendar', label: 'Calendar' }, { tab: 'upcoming', to: '/tasks', icon: 'list', label: 'Upcoming' }, YOU],
}

/** Only the active tab shows its label. */
export function BottomBar({ role, active }: { role: Role; active: Tab }) {
  const navigate = useNavigate()
  const tabs = TABS[role]
  const tab = (t: TabDef) => {
    const on = active === t.tab
    return (
      <NavLink key={t.tab} to={t.to} className={`nav-tab${on ? ' on' : ''}`} aria-label={t.label} aria-current={on ? 'page' : undefined}>
        <Icon name={t.icon} size={19} stroke={1.85} color={on ? 'var(--paper)' : 'var(--muted-3)'} />
        {on && <span>{t.label}</span>}
      </NavLink>
    )
  }
  return (
    <nav className="bottom-bar-wrap">
      <div className={tabs.length > 4 ? 'bottom-bar many' : 'bottom-bar'}>
        {tabs.slice(0, 2).map(tab)}
        <button type="button" className="nav-ori" aria-label="Talk to Ori" onClick={() => navigate('/ori')}>
          <Ori size={40} />
        </button>
        {tabs.slice(2).map(tab)}
      </div>
    </nav>
  )
}
