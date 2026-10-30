import { Link } from 'react-router-dom'
import type { JournalEntry, Note } from '../data/types'
import { MONTHS_SHORT } from '../lib/date'

/** Every photo of a note, oldest notes included (they kept one in `image`). */
export const photosOf = (n: Note) => (n.images?.length ? n.images : n.image ? [n.image] : [])

/** "30 Oct · 07:02", and the year when it isn't this one. */
export function stamp(iso: string) {
  const d = new Date(iso)
  const year = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Where and when a note was made, on one quiet line. */
export function NoteMeta({ note, style }: { note: Note; style?: React.CSSProperties }) {
  return (
    <div className="note-meta" style={style}>
      {note.place && <span className="note-place"><Pin />{note.place}</span>}
      <span>{stamp(note.createdAt)}</span>
    </div>
  )
}

const Pin = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: '0 0 auto' }}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="12" cy="9.5" r="2.4" fill="currentColor" />
  </svg>
)

const ITEM = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/
const BOX = /^\[( |x|X)\]\s*(.*)$/

/** Tick or untick one goal of a note: flips its "[ ]" / "[x]" box; a plain "- " line becomes ticked. */
export function toggleLine(body: string, index: number) {
  const lines = body.split('\n')
  const line = lines[index]
  const m = line.match(ITEM)
  if (m && !BOX.test(m[1])) lines[index] = line.slice(0, line.length - m[1].length) + `[x] ${m[1]}`
  else lines[index] = line.replace(/\[( |x|X)\]/, (_, c: string) => (c === ' ' ? '[x]' : '[ ]'))
  return lines.join('\n')
}

/**
 * A note's text with "- " lines as bullets and "- [ ]" / "- [x]" as boxes. Cut after `lines` lines.
 * With `onToggle`, every list line is a goal to tick and strike through; it gets the line's index in `body`.
 */
export function NoteText({ body, lines, onToggle }: { body: string; lines?: number; onToggle?: (index: number) => void }) {
  const all = body.split('\n').map((text, i) => ({ text, i })).filter((l, k, a) => l.text.trim() || (k > 0 && a[k - 1].text.trim()))
  const shown = lines ? all.slice(0, lines) : all
  return (
    <div className="note-text">
      {shown.map(({ text: l, i }) => {
        const m = l.match(ITEM)
        if (m) {
          const box = m[1].match(BOX)
          const done = !!box && box[1] !== ' '
          const label = <span style={done ? { textDecoration: 'line-through', color: 'var(--muted-4)' } : undefined}>{box ? box[2] : m[1]}</span>
          if (onToggle) {
            return (
              <button key={i} type="button" className="note-li note-check" aria-pressed={done} onClick={() => onToggle(i)}>
                <span className={done ? 'note-box on' : 'note-box'} aria-hidden="true">
                  {done && <svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                </span>{label}
              </button>
            )
          }
          return (
            <div key={i} className="note-li">
              <span aria-hidden="true">{box ? (done ? '●' : '○') : '•'}</span>{label}
            </div>
          )
        }
        return l.trim() ? <div key={i} className="note-p">{l}</div> : <div key={i} style={{ height: 6 }} />
      })}
      {lines && all.length > lines && <div className="note-p" style={{ color: 'var(--muted-3)' }}>…</div>}
    </div>
  )
}

/** A note's goals (its list lines) and how many are ticked, when it has any. */
export function checklist(body: string) {
  const items = body.split('\n').map((l) => l.match(ITEM)?.[1]).filter((x): x is string => x !== undefined)
  return items.length ? { done: items.filter((i) => /^\[(x|X)\]/.test(i)).length, total: items.length } : null
}

/** The first line that isn't a goal, for a card's one-line summary. */
const firstLine = (body: string) => body.split('\n').map((l) => l.trim()).find((l) => l && !ITEM.test(l)) ?? ''

/** What a search matches: the title, the text and the place. */
export const matches = (n: Note, q: string) => !q || `${n.title}\n${n.body}\n${n.place ?? ''}`.toLowerCase().includes(q.toLowerCase())

/** A note in the grid, like a Keep card: a strip of its photo, the title, a one-line summary. */
export function NoteCard({ note: n }: { note: Note }) {
  const photos = photosOf(n)
  const list = checklist(n.body)
  const line = firstLine(n.body)
  return (
    <Link to={`/notes/${n.id}`} className="card keep-card">
      {photos.length > 0 && (
        <div className="keep-photo">
          <img src={photos[0]} alt="" loading="lazy" />
          {photos.length > 1 && <span className="keep-count">+{photos.length - 1}</span>}
        </div>
      )}
      <div className="keep-body">
        <div className="keep-title">{n.title || line || 'Untitled'}</div>
        {list ? (
          <>
            <div className="keep-sum">{list.done === list.total ? `All ${list.total} goals done` : `${list.total} goals · ${list.done} done`}</div>
            <div className="keep-bar" aria-hidden="true"><span style={{ width: `${(list.done / list.total) * 100}%` }} /></div>
          </>
        ) : (n.title && line && <div className="keep-sum">{line}</div>)}
        <NoteMeta note={n} style={{ marginTop: 8 }} />
      </div>
    </Link>
  )
}

/** A journal day in the grid: the question, the start of the answer, the date. */
export function JournalCard({ entry: e, date, onOpen }: { entry: JournalEntry; date: string; onOpen: () => void }) {
  return (
    <button type="button" className="card keep-card" onClick={onOpen}>
      <div className="keep-body">
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: 'var(--gold-text)' }}>{date.toUpperCase()}</div>
        <div className="keep-title" style={{ marginTop: 5 }}>{e.prompt}</div>
        <div className="keep-sum">{e.body}</div>
      </div>
    </button>
  )
}
