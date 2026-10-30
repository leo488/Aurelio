import { NavLink, useNavigate } from 'react-router-dom'
import type { Role } from '../data/types'
import { Icon, type IconName } from './Icon'
import { Ori } from './Ori'

export type Tab = 'today' | 'week' | 'journal' | 'routines' | 'streaks' | 'calendar' | 'upcoming' | 'you' | null

type TabDef = { tab: Exclude<Tab, null>; to: string; icon: IconName; label: string }

const TODAY: TabDef = { tab: 'today', to: '/today', icon: 'sun', label: 'Today' }
const YOU: TabDef = { tab: 'you', to: '/profile', icon: 'user', label: 'You' }

/** Leo's bar is built around his week, Soniya's around her plan. Ori sits in the middle: Leo's journal and notes, Soniya's chat. */
export const TABS: Record<Role, TabDef[]> = {
  leo: [TODAY, { tab: 'week', to: '/week', icon: 'calendar', label: 'Week' }, { tab: 'streaks', to: '/streak', icon: 'flame', label: 'Streak' }, YOU],
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
        {role === 'leo' ? (
          <button type="button" className={active === 'journal' ? 'nav-ori on' : 'nav-ori'} aria-label="Journal and notes" aria-current={active === 'journal' ? 'page' : undefined} onClick={() => navigate('/journal')}>
            <Ori size={40} />
          </button>
        ) : (
          <button type="button" className="nav-ori" aria-label="Talk to Ori" onClick={() => navigate('/ori')}>
            <Ori size={40} />
          </button>
        )}
        {tabs.slice(2).map(tab)}
      </div>
    </nav>
  )
}
