import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { InstallHint, PushHint } from '../components/InstallHint'
import { checklist, NoteText, photosOf } from '../components/notes'
import { StatCards } from '../components/StatCards'
import { TodayList } from '../components/track'
import { headerDate, Label, PartnerStrip, RemindSheet } from '../components/ui'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import { logicalToday, weekKey } from '../lib/date'
import { greeting } from '../lib/greeting'
import { promptFor } from '../lib/journalPrompts'
import { checkedSet, dayScore, trackStreak } from '../lib/track'

/** Leo's home: today's list from his week, the streak, today's journal question and his pinned notes. */
export function Today() {
  const data = useData()
  const { me, name } = useMe()
  const [remind, setRemind] = useState(false)
  const today = logicalToday()
  const now = new Date()
  const week = weekKey(today)
  const checked = checkedSet(Object.values(data.trackChecks))
  const day = dayScore(data.trackItems, checked, today)
  const streak = trackStreak(data.trackItems, checked, today)
  const entry = data.journal.find((e) => e.date === today)
  const pinned = data.notes.filter((n) => n.pinned)

  return (
    <main className="screen" style={{ background: 'var(--wash-default)' }}>
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/profile" aria-label="Your profile" style={{ lineHeight: 0 }}><Avatar user={me.role} size={46} /></Link>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{headerDate(today)}</div>
          <h1 className="display" style={{ fontSize: 29, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.1, margin: '3px 0 0' }}>{greeting(now)}, {name}</h1>
        </div>
        <Link to="/notifications" aria-label="Notifications" style={{ padding: 6, lineHeight: 0 }}>
          <Icon name="bell" size={22} stroke={1.7} />
        </Link>
      </div>

      <InstallHint />
      <PushHint />

      <StatCards done={day.done} total={day.total} unit="Tasks" streak={streak.current} streakCaption="Day streak" streakTo="/streak" today={today} fire weekTo="/week" />

      <div className="pad" style={{ paddingTop: 20 }}>
        <Link to="/journal" className="card journal-card">
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'var(--gold-text)' }}>{entry ? 'JOURNAL · WRITTEN TODAY' : 'TODAY’S QUESTION'}</div>
          <div className="display" style={{ fontSize: 18.5, fontWeight: 700, letterSpacing: '-.015em', lineHeight: 1.3, marginTop: 6 }}>{entry?.prompt ?? promptFor(today)}</div>
          {entry?.body && <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 6, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.body}</div>}
        </Link>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label>Today’s list</Label>
          {day.total > 0 && <div style={{ fontSize: 12.5, fontWeight: 800, color: day.done === day.total ? 'var(--gold-text)' : 'var(--muted-2)' }}>{day.done === day.total ? 'All done' : `${day.done} of ${day.total}`}</div>}
        </div>
        <TodayList today={today} week={week} />
        {day.total === 0 && <Link to="/week" className="link-gold" style={{ display: 'block', fontSize: 14, padding: '12px 0' }}>Set up this week’s list</Link>}
      </div>

      <div className="pad" style={{ paddingTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label>Notes</Label>
          <Link to="/journal?tab=notes" style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted-2)' }}>All notes ›</Link>
        </div>
        {pinned.length > 0 && (
          <div className="note-tiles">
            {pinned.map((n) => {
              const photo = photosOf(n)[0]
              const list = checklist(n.body)
              return (
                <Link key={n.id} to={`/notes/${n.id}`} className="card note-tile">
                  {photo ? <img src={photo} alt="" loading="lazy" /> : <div className="note-tile-text"><NoteText body={n.body} lines={4} /></div>}
                  <div className="note-tile-title">{n.title || 'Untitled'}</div>
                  {list && <div className="note-tile-sub">{list.done}/{list.total} done</div>}
                </Link>
              )
            })}
          </div>
        )}
        {pinned.length === 0 && (
          <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '10px 0', lineHeight: 1.5 }}>
            Pin a note to keep it here. Tap Ori below, then Notes, to snap a page of your notepad.
          </div>
        )}
      </div>

      <div className="pad" style={{ paddingTop: 16 }}>
        <PartnerStrip onRemind={() => setRemind(true)} />
      </div>
      <RemindSheet open={remind} onClose={() => setRemind(false)} />
    </main>
  )
}
