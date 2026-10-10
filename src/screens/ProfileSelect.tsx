import { useNavigate } from 'react-router-dom'
import { AppMark } from '../components/AppMark'
import { displayName, useSession, type User } from '../store/session'
import styles from './ProfileSelect.module.css'

// Scaffold version of route 1. Avatars, embers and streaks arrive with the shared components.
export function ProfileSelect() {
  const setUser = useSession((s) => s.setUser)
  const navigate = useNavigate()
  const pick = (u: User) => {
    setUser(u)
    navigate('/today')
  }
  return (
    <main className={`screen ${styles.root}`}>
      <AppMark size={44} />
      <h1 className={styles.title}>Who are you today?</h1>
      <div className={styles.people}>
        {(['leo', 'soniya'] as const).map((u) => (
          <button key={u} className={styles.person} onClick={() => pick(u)}>
            <span className={styles.avatar} data-user={u} />
            <span className={styles.name}>{displayName[u]}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
