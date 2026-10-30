import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Label, ScreenHeader } from '../components/ui'
import { NotesList } from './Notes'
import { useData } from '../data/store'
import { logicalToday, MONTHS_SHORT, WEEKDAY_LONG, weekday } from '../lib/date'
import { anotherPrompt, promptFor } from '../lib/journalPrompts'

const longDate = (d: string) => `${WEEKDAY_LONG[weekday(d)]} ${Number(d.slice(8))} ${MONTHS_SHORT[Number(d.slice(5, 7)) - 1]}`

/**
 * What Ori opens for Leo: his journal and his notes, side by side.
 * The journal is a question a day and room to answer it, saved as he types, with past days below.
 */
export function Journal() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const today = logicalToday()
  const notes = params.get('tab') === 'notes'
  const asked = params.get('d')
  const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today
  const past = data.journal.filter((e) => e.date !== date && e.body.trim())
  const tab = (key: 'journal' | 'notes', label: string) => {
    const on = notes === (key === 'notes')
    return (
      <button type="button" role="tab" aria-selected={on} className={on ? 'seg-tab on' : 'seg-tab'}
        onClick={() => setParams(key === 'notes' ? { tab: 'notes' } : {}, { replace: true })}>{label}</button>
    )
  }

  return (
    <main className="screen" style={{ background: 'var(--wash-default)' }}>
      <ScreenHeader title={notes ? 'Notes' : 'Journal'} sub={notes ? `${data.notes.length} ${data.notes.length === 1 ? 'note' : 'notes'}` : date === today ? longDate(date) : <>{longDate(date)} · <button type="button" className="link-gold" onClick={() => setParams({}, { replace: true })}>Today</button></>} />
      <div className="pad" style={{ paddingTop: 14 }}>
        <div className="seg" role="tablist">{tab('journal', 'Journal')}{tab('notes', data.notes.length ? `Notes · ${data.notes.length}` : 'Notes')}</div>
      </div>
      {notes ? <NotesList /> : <>
      <Entry key={date} date={date} today={today} />
      {past.length > 0 && (
        <div className="pad" style={{ paddingTop: 18 }}>
          <Label>Earlier</Label>
          {past.map((e) => (
            <button key={e.id} type="button" onClick={() => { setParams({ d: e.date }); window.scrollTo(0, 0) }} className="list-row" style={{ display: 'block' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted-3)' }}>{longDate(e.date)}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 3 }}>{e.prompt}</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 3, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.body}</div>
            </button>
          ))}
        </div>
      )}
      </>}
    </main>
  )
}

/** One day's question and answer. Remounts per day, and saves on a pause in typing and on the way out. */
function Entry({ date, today }: { date: string; today: string }) {
  const saved = useData.getState().journal.find((x) => x.date === date)
  const [prompt, setPrompt] = useState(saved?.prompt ?? promptFor(date))
  const [body, setBody] = useState(saved?.body ?? '')
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef({ prompt, body })
  useEffect(() => {
    latest.current = { prompt, body }
  }, [prompt, body])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const { prompt: p, body: b } = latest.current
    const old = useData.getState().journal.find((x) => x.date === date)
    if ((old?.body ?? '') !== b) useData.getState().saveJournal(date, p, b)
  }, [date])
  useEffect(() => () => flush(), [flush])
  const type = (v: string) => {
    setBody(v)
    latest.current = { prompt, body: v }
    clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 900)
  }

  return (
    <div className="pad" style={{ paddingTop: 18 }}>
      <div className="card" style={{ padding: '18px 16px 14px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'var(--gold-text)' }}>{date === today ? 'TODAY’S QUESTION' : 'THE QUESTION'}</div>
        <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.28, marginTop: 8 }}>{prompt}</div>
        {!body.trim() && (
          <button type="button" onClick={() => setPrompt(anotherPrompt(prompt))} style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)', marginTop: 12 }}>↻ Another question</button>
        )}
      </div>
      <textarea className="big-text" value={body} onChange={(e) => type(e.target.value)} onBlur={flush} aria-label="Your answer"
        placeholder="Write whatever comes. No one else sees this." style={{ marginTop: 18, minHeight: 260 }} />
    </div>
  )
}
