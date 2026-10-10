import { NavLink, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { Ori } from './Ori'

export type Tab = 'today' | 'routines' | 'calendar' | 'together' | null

const TABS: { tab: Exclude<Tab, null>; to: string; icon: IconName; label: string }[] = [
  { tab: 'today', to: '/today', icon: 'sun', label: 'Today' },
  { tab: 'routines', to: '/routines', icon: 'list', label: 'Routines' },
  { tab: 'calendar', to: '/calendar', icon: 'calendar', label: 'Calendar' },
  { tab: 'together', to: '/together', icon: 'together', label: 'Together' },
]

/** Five slots: four tabs and Ori in the centre. Only the active tab shows its label. */
export function BottomBar({ active }: { active: Tab }) {
  const navigate = useNavigate()
  const tab = (t: (typeof TABS)[number]) => {
    const on = active === t.tab
    return (
      <NavLink key={t.tab} to={t.to} className={`nav-tab${on ? ' on' : ''}`} aria-label={t.label} aria-current={on ? 'page' : undefined}>
        <Icon name={t.icon} size={19} stroke={1.85} color={on ? '#F6F1E9' : '#9C9287'} />
        {on && <span>{t.label}</span>}
      </NavLink>
    )
  }
  return (
    <nav className="bottom-bar-wrap">
      <div className="bottom-bar">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <button type="button" className="nav-ori" aria-label="Talk to Ori" onClick={() => navigate('/ori')}>
          <Ori size={40} />
        </button>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  )
}
