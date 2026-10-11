import { useNavigate } from 'react-router-dom'
import { BackButton, Row, Toggle } from '../components/controls'
import { flash } from '../components/Toast'
import { resetLocalDemo } from '../boot'
import { useAuth, useMe } from '../data/session'
import { useData } from '../data/store'
import { backendKind, getAuth } from '../services'

export function Settings() {
  const data = useData()
  const { me } = useMe()
  const navigate = useNavigate()
  const s = data.settings!
  const notifOn = s.notif.reminders || s.notif.deadlines || s.notif.partner
  const local = backendKind() === 'local'

  const lock = async () => {
    await getAuth().signOut()
    useAuth.getState().setSession(null)
    useData.getState().clear()
    navigate('/', { replace: true })
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-settings)' }}>
      <div className="pad top-12" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <BackButton onClick={() => navigate('/profile')} />
        <div style={{ fontSize: 15, fontWeight: 800 }}>Settings</div>
      </div>
      <div className="pad" style={{ paddingTop: 26, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Your day</div>
          {me.role === 'leo' ? (
            <Row title="Routines" value={`${data.routines.filter((r) => r.active).length} active ›`} onClick={() => navigate('/routines')} />
          ) : (
            <Row title="Tasks" value={`${data.tasks.filter((t) => !t.completed).length} open ›`} onClick={() => navigate('/tasks')} />
          )}
          <Row title="Notifications" value={`${notifOn ? 'On' : 'Off'} ›`} onClick={() => navigate('/notifications/settings')} />
          {me.role === 'leo' && <Row last title="Streak rules" value="60% threshold ›" onClick={() => navigate('/streak')} />}
        </div>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Ori</div>
          <Row title="Confirm before creating" sub="Always for 2+ items" right={<Toggle label="Confirm before creating" on={s.oriConfirm} onChange={(v) => data.updateSettings({ oriConfirm: v })} />} />
          <Row last title="What Ori can see" value="Your data only ›" onClick={() => navigate('/ori/chat')} />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Account</div>
          <Row title="Signed in as" value={me.email} />
          <Row last title="Data" value={local ? 'On this device' : 'Synced'} />
        </div>
        <button type="button" className="btn btn-chip" onClick={() => void lock()}>Lock and switch profile</button>
        {local && (
          <button type="button" style={{ fontSize: 12.5, color: 'var(--muted-3)', fontWeight: 700, alignSelf: 'center' }}
            onClick={() => {
              if (!window.confirm('Reset all demo data on this device?')) return
              resetLocalDemo()
              void data.load(me)
              flash('Demo data restored')
            }}>
            Reset demo data
          </button>
        )}
      </div>
    </main>
  )
}
