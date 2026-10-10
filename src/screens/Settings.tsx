import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Row, Toggle } from '../components/controls'
import { flash } from '../components/Toast'
import { useMe, useSession } from '../data/session'
import { myRoutines } from '../data/select'
import { useData } from '../data/store'

export function Settings() {
  const data = useData()
  const { me, name, partnerName } = useMe()
  const setUser = useSession((s) => s.setUser)
  const navigate = useNavigate()
  const s = data.settings[me]
  const active = myRoutines(data, me).filter((r) => !r.paused).length
  const notifOn = s.notif.routineStart || s.notif.deadlines || s.notif.partner

  return (
    <main className="screen" style={{ background: 'var(--wash-settings)' }}>
      <div className="pad" style={{ paddingTop: 'calc(var(--safe-top) + 20px)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar user={me} size={62} />
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>{name}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 2 }}>Paired with {partnerName}</div>
        </div>
      </div>
      <div className="pad" style={{ paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Your day</div>
          <Row title="Routines" value={`${active} active ›`} onClick={() => navigate('/routines')} />
          <Row title="Notifications" value={`${notifOn ? 'On' : 'Off'} ›`} onClick={() => navigate('/notifications/settings')} />
          <Row last title="Streak rules" value="60% threshold ›" onClick={() => navigate('/streak')} />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Ori</div>
          <Row title="Confirm before creating" sub="Always for 2+ items" right={<Toggle label="Confirm before creating" on={s.oriConfirm} onChange={(v) => data.updateSettings(me, { oriConfirm: v })} />} />
          <Row last title="What Ori can see" value="Your data only ›" onClick={() => navigate('/ori/chat')} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-chip" style={{ flex: 1 }} onClick={() => { setUser(null); navigate('/') }}>Switch profile</button>
          <button type="button" className="btn btn-chip" style={{ padding: '15px 18px', fontWeight: 700, color: 'var(--muted-2)' }} onClick={() => navigate('/welcome')}>First day</button>
        </div>
        <button type="button" style={{ fontSize: 12.5, color: 'var(--muted-3)', fontWeight: 700, alignSelf: 'center' }}
          onClick={() => { if (window.confirm('Reset all demo data on this device?')) { data.resetDemo(); flash('Demo data restored') } }}>
          Reset demo data
        </button>
      </div>
    </main>
  )
}
