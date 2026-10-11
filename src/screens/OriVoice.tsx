import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Ori, OriListening, OriThinking } from '../components/Ori'
import { flash } from '../components/Toast'
import { PROFILES, ROLES } from '../config'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import { dateOf, logicalToday, relativeDay, shortDate, timeOf, WEEKDAY_SHORT, weekday } from '../lib/date'
import { parseRequest, summarize, typeColor, typeLabel, type OriItem } from '../lib/ori'
import { applyOriItems, firstDate, isRoutineRequest } from '../lib/oriApply'
import { draftIcon, generateRoutine, type RoutineDraft } from '../lib/routineDraft'
import { CATEGORY_LABEL } from '../data/select'
import { uid } from '../data/store'
import { daysLabel } from '../lib/date'
import { totalMinutes } from '../lib/labels'
import { getRecognition, type Recognition } from '../lib/speech'
import { numberWord, numberWordLower } from '../lib/words'

type Phase = 'listening' | 'typing' | 'thinking' | 'confirm' | 'nothing' | 'draft'

const describe = (i: OriItem) => {
  if (i.type === 'event' && i.start) return `${shortDate(dateOf(i.start)!)} · ${timeOf(i.start)} – ${timeOf(i.end)}`
  if (i.type === 'deadline' && i.due) {
    const warn = i.remindAt && dateOf(i.remindAt) !== dateOf(i.due) ? ` · warn ${WEEKDAY_SHORT[weekday(dateOf(i.remindAt)!)]}` : ''
    return `${shortDate(dateOf(i.due)!)} · ${timeOf(i.due) ?? '23:59'}${warn}`
  }
  if (i.type === 'routineEdit') return 'Applies from tomorrow'
  if (i.due) return [shortDate(dateOf(i.due)!), timeOf(i.due)].filter(Boolean).join(' · ')
  return 'No date'
}

/** Ori's voice overlay: listening → thinking → confirm. Falls back to typing with no dead end. */
export function OriVoice() {
  const { me, partnerName } = useMe()
  const data = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const preset = (location.state as { text?: string } | null)?.text
  const [phase, setPhase] = useState<Phase>(preset ? 'thinking' : 'listening')
  const [transcript, setTranscript] = useState('')
  const [typed, setTyped] = useState('')
  const [items, setItems] = useState<OriItem[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [sorted, setSorted] = useState<{ count: number; summary: string } | null>(null)
  const [draft, setDraft] = useState<RoutineDraft | null>(null)
  const rec = useRef<Recognition | null>(null)
  const finalText = useRef('')
  const touchY = useRef<number | null>(null)
  const today = logicalToday()

  const close = useCallback(() => {
    rec.current?.abort()
    navigate(-1)
  }, [navigate])

  const think = useCallback(async (text: string) => {
    if (!text.trim()) return setPhase('typing')
    setTranscript(text)
    setPhase('thinking')
    const started = Date.now()
    // Leo can ask for a whole routine; it opens as a draft to review, never saved straight away.
    if (me.role === 'leo' && isRoutineRequest(text)) {
      setSorted({ count: 0, summary: 'Building a routine' })
      const d = await generateRoutine(text)
      await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))))
      setDraft(d)
      setPhase('draft')
      return
    }
    const ctx = { today, now: new Date(), routines: useData.getState().routines.map((r) => ({ id: r.id, name: r.name })), names: ROLES.map((r) => PROFILES[r].name) }
    const result = await parseRequest(text, ctx)
    await new Promise((r) => setTimeout(r, Math.max(0, 900 - (Date.now() - started))))
    if (result.length === 0) return setPhase('nothing')
    setSorted({ count: result.length, summary: summarize(result) })
    await new Promise((r) => setTimeout(r, 1100))
    const confirm = useData.getState().settings?.oriConfirm ?? true
    if (result.length === 1 || !confirm) {
      // Small edits apply straight away, with Undo.
      const undo = applyOriItems(result)
      const r = result[0]
      navigate(r.type === 'routineEdit' ? `/routines/${r.routineId}` : me.role === 'sonia' ? `/calendar?d=${firstDate(result)}` : '/today', { replace: true })
      flash(result.length === 1 ? (r.type === 'routineEdit' ? r.title : `Added ${r.title}`) : `${numberWord(result.length)} items added`, { label: 'Undo', run: undo })
      return
    }
    setItems(result)
    setPhase('confirm')
  }, [me, navigate, today])

  useEffect(() => {
    if (preset) {
      think(preset)
      return
    }
    const r = getRecognition()
    if (!r) {
      setPhase('typing')
      return
    }
    rec.current = r
    r.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      finalText.current = text
      setTranscript(text)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') setPhase('typing')
    }
    r.onend = () => {
      setPhase((p) => {
        if (p === 'listening') {
          if (finalText.current.trim()) think(finalText.current)
          else return 'typing'
        }
        return p
      })
    }
    try {
      r.start()
    } catch {
      setPhase('typing')
    }
    return () => r.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = () => {
    rec.current?.stop()
    if (finalText.current.trim()) think(finalText.current)
  }

  const create = () => {
    applyOriItems(items)
    const d = firstDate(items)
    const sameDay = items.every((i) => dateOf(i.start ?? i.due) === d)
    navigate(me.role === 'sonia' ? `/calendar?d=${d}` : '/today', { replace: true })
    flash(`${numberWord(items.length)} items added${sameDay ? ` to ${relativeDay(d, today) === 'Today' ? 'today' : relativeDay(d, today)}` : ''}`)
  }

  const saveDraft = () => {
    if (!draft) return
    const days = draft.days ?? [0, 1, 2, 3, 4, 5, 6]
    data.createRoutine({
      name: draft.name, description: draft.description, icon: draftIcon(draft), timeCategory: draft.timeCategory, categoryLabel: draft.categoryLabel,
      scheduledTime: draft.scheduledTime, repeatPattern: { type: 'weekly', days }, reminder: { enabled: !!draft.scheduledTime, minutesBefore: 15 },
      steps: draft.steps.map((x) => ({ id: uid(), title: x.title, duration: x.duration, days, countsTowardStreak: true })),
    })
    navigate('/routines', { replace: true })
    flash(`${draft.name} saved${draft.scheduledTime ? ` · starts at ${draft.scheduledTime}` : ''}`)
  }

  const label = phase === 'listening' ? 'ORI IS LISTENING' : phase === 'thinking' ? 'WORKING IT OUT' : 'ORI'
  const assumption = items.find((i) => i.assumption)?.assumption

  return (
    <main
      className="screen dark no-bar"
      style={{ background: 'var(--dark-ori)' }}
      onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current > 90 && phase === 'listening') close()
        touchY.current = null
      }}
    >
      <div className="pad top-14" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12.5, color: 'var(--glyph-close)', fontWeight: 800, letterSpacing: '.1em' }}>{label}</div>
        <button type="button" aria-label="Close" onClick={close} style={{ color: 'var(--glyph-close)', fontSize: 16 }}>✕</button>
      </div>

      {phase === 'listening' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }} onClick={finish}>
          <div style={{ paddingTop: 44, display: 'flex', justifyContent: 'center' }}><OriListening size={150} /></div>
          <div style={{ padding: '42px 32px 0' }} aria-live="polite">
            <div className="display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.42, color: transcript ? undefined : 'var(--dark-faint)' }}>
              {transcript ? <>“{transcript}<span style={{ color: 'var(--dark-faint)' }}>…”</span></> : 'Say what’s coming up. A class, a reminder, a deadline…'}
            </div>
          </div>
          <div className="dark-bottom" style={{ marginTop: 'auto', padding: '30px 32px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--dark-hint)', fontWeight: 600 }}>Tap to finish · swipe down to cancel</div>
            <button type="button" onClick={(e) => { e.stopPropagation(); rec.current?.abort(); setPhase('typing') }} style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 800, marginTop: 12 }}>Type instead</button>
          </div>
        </div>
      )}

      {phase === 'typing' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, animation: 'slide-up .3s ease' }}>
          <div style={{ padding: '30px 26px 0', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <Ori size={40} />
            <div className="display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.028em', lineHeight: 1.2 }}>Tell me what’s coming up.</div>
          </div>
          <div style={{ padding: '22px 26px 0' }}>
            <textarea autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} rows={4} aria-label="What should Ori add?"
              placeholder="Tomorrow I have class from nine to twelve, remind me at four to work on my assignment, and it’s due Friday"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); think(typed) } }}
              style={{ width: '100%', background: 'transparent', border: '1px solid var(--dark-outline)', borderRadius: 18, padding: 16, color: 'var(--on-dark)', fontSize: 16, lineHeight: 1.5, outline: 'none', resize: 'none' }} />
            <div style={{ fontSize: 12.5, color: 'var(--dark-hint)', marginTop: 10, lineHeight: 1.5 }}>Voice isn’t available here, so type it instead. Nothing is saved until you say so.</div>
          </div>
          <div className="pad dark-bottom" style={{ marginTop: 'auto', paddingTop: 24 }}>
            <button type="button" className="btn-gold" style={{ width: '100%', opacity: typed.trim() ? 1 : 0.5 }} disabled={!typed.trim()} onClick={() => think(typed)}>Send to Ori</button>
          </div>
        </div>
      )}

      {phase === 'thinking' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center' }}>
          <OriThinking size={132} />
          <div className="display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', marginTop: 40 }}>
            {sorted ? (sorted.count === 0 ? 'Building your routine' : sorted.count === 1 ? 'Sorting that out' : `Sorting that into ${numberWordLower(sorted.count)} things`) : 'Sorting that out'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted-back)', marginTop: 10, lineHeight: 1.6 }}>{sorted && sorted.count > 0 ? sorted.summary : `“${transcript}”`}</div>
        </div>
      )}

      {phase === 'nothing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'slide-up .35s ease' }}>
          <div style={{ padding: '26px 26px 0', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <Ori size={40} />
            <div>
              <div className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.028em', lineHeight: 1.2 }}>I couldn’t place that.</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted-back)', marginTop: 6, lineHeight: 1.6 }}>{me.role === 'leo' ? <>I can build a routine for you to review, or move one. Try “Create a 30-minute morning routine”.</> : <>I can add tasks, appointments, reminders and deadlines. Try “Lunch with {partnerName} Friday at one”.</>}</div>
            </div>
          </div>
          <div className="pad dark-bottom" style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
            <button type="button" className="btn-dark-outline" onClick={() => { setTyped(transcript); setPhase('typing') }}>Type it</button>
            <button type="button" className="btn-dark-outline" onClick={() => navigate('/ori/chat', { replace: true })}>Ask in chat</button>
          </div>
        </div>
      )}

      {phase === 'draft' && draft && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'slide-up .35s ease', minHeight: 0 }}>
          <div style={{ padding: '24px 26px 0', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <Ori size={40} />
            <div>
              <div className="display" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.028em', lineHeight: 1.2 }}>Here’s a draft.</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted-back)', marginTop: 6 }}>Nothing is saved until you say so.</div>
            </div>
          </div>
          <div style={{ padding: '22px 26px 0' }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.025em' }}>{draft.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--glyph-close)', marginTop: 4, fontWeight: 600 }}>
              {[draft.timeCategory === 'custom' ? draft.categoryLabel || 'Custom' : CATEGORY_LABEL[draft.timeCategory], draft.scheduledTime, daysLabel(draft.days ?? [0, 1, 2, 3, 4, 5, 6]), totalMinutes(draft.steps) ? `${totalMinutes(draft.steps)} min` : ''].filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
              {draft.steps.map((x, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--dark-divider)' }}>
                  <div style={{ width: 18, fontSize: 12, fontWeight: 800, color: 'var(--dark-muted-3)' }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 15.5, fontWeight: 700 }}>{x.title}</div>
                  {!!x.duration && <div style={{ fontSize: 12.5, color: 'var(--gold)', fontWeight: 700 }}>{x.duration} min</div>}
                </div>
              ))}
            </div>
            {draft.description && (
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 16 }}>
                <Ori size={22} style={{ marginTop: 1 }} />
                <div style={{ fontSize: 13, color: 'var(--muted-back)', lineHeight: 1.6 }}>{draft.description}</div>
              </div>
            )}
          </div>
          <div className="pad dark-bottom" style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="btn-gold" style={{ padding: 18 }} onClick={saveDraft}>Save routine</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-dark-outline" onClick={() => navigate('/routines/new', { replace: true, state: { draft } })}>Edit first</button>
              <button type="button" className="btn-dark-outline" onClick={close}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'confirm' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'slide-up .35s ease' }}>
          <div style={{ padding: '26px 26px 0', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <Ori size={40} />
            <div style={{ flex: 1 }}>
              <div className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.028em', lineHeight: 1.2 }}>{numberWord(items.length)} {items.every((i) => i.type === 'task' || i.type === 'deadline') ? 'tasks' : 'things'}. Have a look.</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted-back)', marginTop: 6 }}>Nothing is saved until you say so.</div>
            </div>
          </div>
          <div style={{ padding: '24px 26px 0', display: 'flex', flexDirection: 'column' }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--dark-divider)' }}>
                <div style={{ width: 3, borderRadius: 2, background: typeColor(it) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: '.13em', color: 'var(--muted-back)', fontWeight: 800 }}>{typeLabel(it)}</div>
                  {editing === i ? (
                    <EditItem item={it} onDone={(next) => { setItems(items.map((x, k) => (k === i ? next : x))); setEditing(null) }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>{it.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--muted-3)', marginTop: 4 }}>{describe(it)}</div>
                    </>
                  )}
                </div>
                {editing !== i && (
                  <button type="button" onClick={() => setEditing(i)} style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)', alignSelf: 'center' }}>Edit</button>
                )}
              </div>
            ))}
          </div>
          {assumption && (
            <div style={{ padding: '18px 26px 0', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <Ori size={22} style={{ marginTop: 1 }} />
              <div style={{ fontSize: 13, color: 'var(--muted-3)', lineHeight: 1.6 }}>{assumption}</div>
            </div>
          )}
          <div className="pad dark-bottom" style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="btn-gold" style={{ padding: 18 }} onClick={create}>{me.role === 'sonia' ? 'Add' : 'Create'} all {numberWordLower(items.length)}</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-dark-outline" onClick={() => navigate('/ori/chat', { replace: true, state: { from: transcript, summary: summarize(items) } })}>Change something</button>
              <button type="button" className="btn-dark-outline" onClick={() => navigate(-1)}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function EditItem({ item, onDone }: { item: OriItem; onDone: (i: OriItem) => void }) {
  const [title, setTitle] = useState(item.title)
  const when = item.start ?? item.due ?? ''
  const [at, setAt] = useState(when.length === 10 ? `${when}T09:00` : when)
  const save = () => {
    const next: OriItem = { ...item, title: title.trim() || item.title }
    if (at) {
      if (item.type === 'event') {
        const len = item.start && item.end ? new Date(item.end).getTime() - new Date(item.start).getTime() : 3600000
        const end = new Date(new Date(at).getTime() + len)
        next.start = at
        next.end = `${at.slice(0, 10)}T${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
      } else {
        next.due = at
        if (item.remindAt && item.type === 'task') next.remindAt = at
      }
    }
    onDone(next)
  }
  const field: React.CSSProperties = { width: '100%', background: 'transparent', border: '1px solid var(--dark-outline)', borderRadius: 12, padding: '9px 11px', color: 'var(--on-dark)', fontSize: 15, marginTop: 6, outline: 'none', colorScheme: 'dark' }
  return (
    <div>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" style={{ ...field, fontWeight: 800 }} onKeyDown={(e) => e.key === 'Enter' && save()} />
      {item.type !== 'routineEdit' && <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} aria-label="When" style={field} />}
      <button type="button" onClick={save} style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)', marginTop: 8 }}>Done</button>
    </div>
  )
}
