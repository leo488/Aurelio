import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { InstallHint, PushHint } from '../components/InstallHint'
import { parseQuickTask } from '../components/tasks'
import { flash } from '../components/Toast'
import { headerDate, Label, PartnerStrip, RemindSheet, shortDay, StatCards, TaskSheet, TaskTimeRow } from '../components/ui'
import { useMe } from '../data/session'
import { overdueTasks, tasksOn } from '../data/select'
import { useData } from '../data/store'
import { addDays, hhmm, logicalToday, looseTime, nowMinutes } from '../lib/date'
import { greeting } from '../lib/greeting'
import { soniaStats } from '../lib/stats'

/** Soniya's home: what's on today, how far through it she is, and adding a task in place. */
export function SoniaToday() {
  const data = useData()
  const { me, name } = useMe()
  const navigate = useNavigate()
  const [quick, setQuick] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [remind, setRemind] = useState(false)
  const today = logicalToday()
  const now = new Date()
  const list = tasksOn(data, today)
  const done = list.filter((t) => t.completed).length
  const planning = soniaStats(data, today).streak
  const overdue = overdueTasks(data, today)
  const clock = hhmm(nowMinutes(now))
  const next = list.find((t) => !t.completed && t.startTime && t.startTime >= clock) ?? list.find((t) => !t.completed)
  const tomorrow = tasksOn(data, addDays(today, 1)).length

  const add = () => {
    if (!quick.trim()) return
    const p = parseQuickTask(quick)
    data.addTask({ title: p.title, date: today, startTime: p.startTime, priority: 'medium' })
    setQuick('')
    flash(p.startTime ? `Added to today at ${looseTime(p.startTime)}` : 'Added to today')
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-default)' }}>
      <div className="pad top" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/profile" aria-label="Your profile" style={{ lineHeight: 0 }}><Avatar user={me.role} size={46} /></Link>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{headerDate(today)}</div>
          <h1 className="display" style={{ fontSize: 29, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.1, margin: '3px 0 0' }}>{greeting(now)}, {name}.</h1>
        </div>
        <Link to="/notifications" aria-label="Notifications" style={{ padding: 6, lineHeight: 0 }}>
          <Icon name="bell" size={22} stroke={1.7} />
        </Link>
      </div>

      <InstallHint />
      <PushHint />

      <StatCards done={done} total={list.length} unit="Tasks" streak={planning} streakCaption="Plan streak" streakTo="/profile" today={today} />
      <div className="pad" style={{ paddingTop: 14, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold-text)' }}>
        <Icon name="clock" size={15} stroke={1.7} color="var(--gold-text)" />
        <div style={{ fontSize: 12.5, fontWeight: 800 }}>{next ? `Next: ${next.title}${next.startTime ? ` at ${next.startTime}` : ''}` : list.length ? 'Nothing left today' : 'Nothing planned today'}</div>
      </div>

      {overdue.length > 0 && (
        <div className="pad" style={{ paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {overdue.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 18, background: 'var(--clay-badge)' }}>
              <button type="button" aria-label={`Complete: ${t.title}`} onClick={() => { data.toggleTask(t.id); flash(`Done · ${t.title}`) }} style={{ lineHeight: 0, flex: '0 0 auto' }}>
                <span style={{ display: 'block', width: 22, height: 22, borderRadius: '50%', border: '1.8px solid var(--clay-pale)', boxSizing: 'border-box' }} />
              </button>
              <button type="button" onClick={() => setOpen(t.id)} style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'var(--clay)', fontWeight: 700, marginTop: 2 }}>Overdue since {shortDay(t.date!, today)}</div>
              </button>
              <button type="button" onClick={() => { data.updateTask(t.id, { date: today }); flash('Moved to Today') }}
                style={{ background: 'var(--white)', color: 'var(--clay-strong)', fontSize: 12, fontWeight: 800, padding: '8px 11px', borderRadius: 99 }}>Today</button>
            </div>
          ))}
        </div>
      )}

      <div className="pad" style={{ paddingTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--white)', border: '1px solid var(--input-line)', borderRadius: 20, padding: '8px 8px 8px 16px' }}>
          <input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add a task for today…" aria-label="Add a task for today"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--ink)', padding: '8px 0', minWidth: 0 }} />
          <button type="button" onClick={add} aria-label="Add"
            style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={18} stroke={1.9} color="var(--paper)" />
          </button>
        </div>
        <button type="button" onClick={() => navigate(`/tasks/new?date=${today}${quick.trim() ? `&title=${encodeURIComponent(quick.trim())}` : ''}`)}
          style={{ marginTop: 9, padding: '0 4px', fontSize: 12.5, fontWeight: 800, color: 'var(--gold-text)' }}>
          Add with time, reminder or priority
        </button>
      </div>

      <div className="pad" style={{ paddingTop: 22 }}>
        <Label>Today’s plan</Label>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {list.map((t) => <TaskTimeRow key={t.id} task={t} onOpen={setOpen} />)}
          {list.length === 0 && <div style={{ padding: '26px 0', textAlign: 'center', fontSize: 14, color: 'var(--muted-2)' }}>Nothing planned yet. Add something above.</div>}
        </div>
        <Link to={`/calendar?d=${addDays(today, 1)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 14, padding: '15px 0', color: 'inherit' }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>Tomorrow</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted-2)', fontWeight: 600 }}>{tomorrow} {tomorrow === 1 ? 'task' : 'tasks'} ›</div>
        </Link>
      </div>

      <div className="pad" style={{ paddingTop: 6 }}>
        <PartnerStrip onRemind={() => setRemind(true)} />
      </div>
      <TaskSheet taskId={open} onClose={() => setOpen(null)} />
      <RemindSheet open={remind} onClose={() => setRemind(false)} />
    </main>
  )
}
