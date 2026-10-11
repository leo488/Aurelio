import { NavLink, useNavigate } from 'react-router-dom'
import type { Role } from '../data/types'
import { Icon, type IconName } from './Icon'
import { Ori } from './Ori'

export type Tab = 'today' | 'routines' | 'progress' | 'calendar' | 'tasks' | 'together' | null

type TabDef = { tab: Exclude<Tab, null>; to: string; icon: IconName; label: string }

const TODAY: TabDef = { tab: 'today', to: '/today', icon: 'sun', label: 'Today' }
const TOGETHER: TabDef = { tab: 'together', to: '/together', icon: 'together', label: 'Together' }

/** Leo's bar is built around routines, Sonia's around her plan. Same five slots, Ori in the centre. */
export const TABS: Record<Role, TabDef[]> = {
  leo: [TODAY, { tab: 'routines', to: '/routines', icon: 'list', label: 'Routines' }, { tab: 'progress', to: '/profile', icon: 'flame', label: 'Progress' }, TOGETHER],
  sonia: [TODAY, { tab: 'calendar', to: '/calendar', icon: 'calendar', label: 'Calendar' }, { tab: 'tasks', to: '/tasks', icon: 'list', label: 'Tasks' }, TOGETHER],
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
      <div className="bottom-bar">
        {tab(tabs[0])}
        {tab(tabs[1])}
        <button type="button" className="nav-ori" aria-label="Talk to Ori" onClick={() => navigate('/ori')}>
          <Ori size={40} />
        </button>
        {tab(tabs[2])}
        {tab(tabs[3])}
      </div>
    </nav>
  )
}
