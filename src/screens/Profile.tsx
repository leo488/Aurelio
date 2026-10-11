import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Ember } from '../components/Ember'
import { Icon } from '../components/Icon'
import { flash } from '../components/Toast'
import { catLook, Label, RemindSheet, useCheer, usePartnerLine } from '../components/ui'
import { resetLocalDemo } from '../boot'
import { useAuth, useMe } from '../data/session'
import { dayProgress } from '../data/select'
import { useData } from '../data/store'
import type { Role } from '../data/types'
import { addDays, fromISO, logicalToday, MONTHS, weekday, WEEKDAY_LETTER } from '../lib/date'
import { leoStats, soniaStats } from '../lib/stats'
import { consistency } from '../lib/streak'
import { backendKind, getAuth } from '../services'

const Cell = ({ value, caption, bottom }: { value: React.ReactNode; caption: string; bottom?: boolean }) => (
  <div style={{ padding: '14px 0', borderTop: '1px solid var(--divider)', borderBottom: bottom ? '1px solid var(--divider)' : undefined }}>
    <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em' }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--muted-2)', fontWeight: 700, marginTop: 2 }}>{caption}</div>
  </div>
)

const Big = ({ streak, unit, line }: { streak: number; unit: string; line: string }) => (
  <div className="pad" style={{ paddingTop: 26, display: 'flex', alignItems: 'center', gap: 16 }}>
    <Ember streak={streak} size={58} />
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <div className="display" style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 0.95 }}>{streak}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-2)' }}>{unit}</div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted-1)', marginTop: 5 }}>{line}</div>
    </div>
  </div>
)

/** Seven bars, today in gold. `values` are 0..max. */
function Bars({ days, values, max, color, showValues }: { days: string[]; values: number[]; max: number; color: string; showValues?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end', height: 118, marginTop: 14 }}>
      {days.map((d, i) => (
        <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 7, height: '100%' }} title={d}>
          {showValues && <div style={{ fontSize: 10.5, color: 'var(--chip-text)', fontWeight: 800 }}>{values[i]}</div>}
          <div style={{ width: '100%', borderRadius: 7, height: Math.max(6, Math.round((values[i] / max) * 92)), background: i === days.length - 1 ? 'var(--gold)' : color, transition: 'height .7s cubic-bezier(.2,.8,.2,1)', animation: 'bar-grow .7s cubic-bezier(.2,.8,.2,1)', transformOrigin: 'bottom' }} />
          <div style={{ fontSize: 10.5, color: 'var(--muted-3)', fontWeight: 800 }}>{WEEKDAY_LETTER[weekday(d)]}</div>
        </div>
      ))}
    </div>
  )
}

/** Each person's profile: their own performance, the other person's day as a number, and settings. */
export function Profile() {
  const { me, name, partnerRole, partnerName } = useMe()
  const navigate = useNavigate()
  const [remind, setRemind] = useState(false)
  const cheer = useCheer()
  const partnerLine = usePartnerLine()
  const local = backendKind() === 'local'

  const signOut = async () => {
    await getAuth().signOut()
    useAuth.getState().setSession(null)
    useData.getState().clear()
  }
  const lock = async () => {
    await signOut()
    navigate('/', { replace: true })
  }
  const changePin = async (role: Role) => {
    await signOut()
    navigate('/', { replace: true, state: { reset: role } })
  }
  const row = (title: string, onClick: () => void, opts?: { last?: boolean; clay?: boolean }) => (
    <button type="button" onClick={onClick}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: opts?.last ? undefined : '1px solid var(--divider)', width: '100%', textAlign: 'left' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: opts?.clay ? 'var(--clay)' : undefined }}>{title}</div>
      {!opts?.clay && <div style={{ fontSize: 14, color: 'var(--muted-2)' }}>›</div>}
    </button>
  )

  return (
    <main className="screen" style={{ background: 'var(--wash-settings)' }}>
      <div className="pad" style={{ paddingTop: 'calc(var(--safe-top) + 20px)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar user={me.role} size={62} />
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>{name}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 2, fontWeight: 600 }}>{me.role === 'leo' ? 'Routines and habits' : 'Day planner'}</div>
        </div>
      </div>

      {me.role === 'leo' ? <LeoPerformance /> : <SoniaPerformance />}

      <div className="pad" style={{ paddingTop: 26 }}>
        <Label>{partnerName} today</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
          <Avatar user={partnerRole} size={34} />
          <div style={{ flex: 1, fontSize: 14, color: 'var(--chip-suggest-text)' }}>{partnerLine}</div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button type="button" onClick={() => setRemind(true)} style={{ flex: 1, padding: 14, borderRadius: 16, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 800 }}>Send a reminder</button>
          <button type="button" onClick={cheer} style={{ flex: 1, padding: 14, borderRadius: 16, background: 'var(--chip)', color: 'var(--chip-suggest-text)', fontSize: 14, fontWeight: 800 }}>Send a cheer</button>
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 26 }}>
        <Label style={{ marginBottom: 2 }}>Settings</Label>
        {row('Notifications', () => navigate('/notifications'))}
        {row('Reminder settings', () => navigate('/notifications/settings'))}
        {row('Change PIN', () => void changePin(me.role))}
        {local && row('Reset demo data', () => {
          if (!window.confirm('Reset all demo data on this device?')) return
          resetLocalDemo()
          void useData.getState().load(me)
          flash('Demo data restored')
        })}
        {row('Sign out', () => void lock(), { last: true, clay: true })}
      </div>
      <RemindSheet open={remind} onClose={() => setRemind(false)} />
    </main>
  )
}

function LeoPerformance() {
  const data = useData()
  const today = logicalToday()
  const s = leoStats(data, today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const values = days.map((d) => {
    const p = dayProgress(data, d)
    return p.total ? Math.round((p.done / p.total) * 100) : 0
  })
  return (
    <>
      <Big streak={s.current} unit="day streak" line={`Days with every routine done · longest ${s.longest}`} />
      <div className="pad" style={{ paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <Cell value={`${s.today.rate}%`} caption="Today" />
        <Cell value={s.routinesCompleted} caption="Routines completed" />
        <Cell value={`${s.weekly}%`} caption="This week" bottom />
        <Cell value={`${s.monthly}%`} caption="This month" bottom />
      </div>
      <div className="pad" style={{ paddingTop: 24 }}>
        <Label>Weekly consistency</Label>
        <Bars days={days} values={values} max={100} color="var(--olive)" />
      </div>
      <div className="pad" style={{ paddingTop: 24 }}>
        <Label>By routine</Label>
        {s.perRoutine.filter((x) => x.routine.active).map(({ routine: r, current, longest }) => {
          const look = catLook(r)
          return (
            <Link key={r.id} to={`/routines/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--divider)', color: 'inherit' }}>
              <Icon name={look.icon} size={20} color={look.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>Best {longest} · {consistency([r], data.completions, today, 90)}% over 90 days</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ember streak={current} size={16} />
                <div className="display" style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.03em' }}>{current}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

const SHADES = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']

function SoniaPerformance() {
  const data = useData()
  const today = logicalToday()
  const s = soniaStats(data, today)
  const days = s.week.map((d) => d.date)
  const values = s.week.map((d) => d.done)
  const month = today.slice(0, 7)
  const first = fromISO(`${month}-01`)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const doneOn = (iso: string) => data.tasks.filter((t) => t.date === iso && t.completed).length
  return (
    <>
      <Big streak={s.streak} unit="day planning streak" line="Days you finished at least 60% of your plan" />
      <div className="pad" style={{ paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <Cell value={s.today.done} caption="Completed today" />
        <Cell value={s.today.total - s.today.done} caption="Remaining today" />
        <Cell value={`${s.today.rate}%`} caption="Daily completion" bottom />
        <Cell value={s.completed} caption="Tasks completed" bottom />
      </div>
      <div className="pad" style={{ paddingTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label>Weekly productivity</Label>
          <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 700 }}>{s.weekly.done} done</div>
        </div>
        <Bars days={days} values={values} max={Math.max(6, ...values)} color="var(--iris)" showValues />
      </div>
      <div className="pad" style={{ paddingTop: 24 }}>
        <Label>Calendar activity · {MONTHS[first.getMonth()]}</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 14 }}>
          {Array.from({ length: weekday(`${month}-01`) }, (_, i) => <div key={`b${i}`} style={{ aspectRatio: '1' }} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const iso = `${month}-${String(i + 1).padStart(2, '0')}`
            const bg = iso > today ? 'var(--heat-future)' : SHADES[Math.min(4, doneOn(iso))]
            return <div key={iso} title={iso} style={{ aspectRatio: '1', borderRadius: 6, background: bg, boxShadow: iso === today ? 'inset 0 0 0 1.5px var(--ink)' : undefined }} />
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 10 }}>Darker means more done. Future days stay blank until they happen.</div>
      </div>
    </>
  )
}
