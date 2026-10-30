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

/** Flip the "[ ]" / "[x]" box on one line of a note's text. */
export function toggleLine(body: string, index: number) {
  const lines = body.split('\n')
  lines[index] = lines[index].replace(/\[( |x|X)\]/, (_, c: string) => (c === ' ' ? '[x]' : '[ ]'))
  return lines.join('\n')
}

/**
 * A note's text with "- " lines as bullets and "- [ ]" / "- [x]" as boxes. Cut after `lines` lines.
 * With `onToggle`, boxes can be ticked; it gets the line's index in `body`.
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
          if (box && onToggle) {
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

/** How many of a note's boxes are ticked, when it has any. */
export function checklist(body: string) {
  const boxes = body.split('\n').map((l) => l.match(ITEM)?.[1].match(BOX)).filter(Boolean)
  return boxes.length ? { done: boxes.filter((b) => b![1] !== ' ').length, total: boxes.length } : null
}

/** A note in the grid, like a Keep card: its photo on top, then the title and the first lines. */
export function NoteCard({ note: n }: { note: Note }) {
  const photos = photosOf(n)
  const list = checklist(n.body)
  return (
    <Link to={`/notes/${n.id}`} className="card keep-card">
      {photos.length > 0 && (
        <div className="keep-photo">
          <img src={photos[0]} alt="" loading="lazy" />
          {photos.length > 1 && <span className="keep-count">+{photos.length - 1}</span>}
        </div>
      )}
      <div className="keep-body">
        {n.title && <div className="keep-title">{n.title}</div>}
        <NoteText body={n.body} lines={photos.length ? 4 : 7} />
        {list && <div className="keep-progress">{list.done}/{list.total} done</div>}
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
        <div className="note-text" style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.body}</div>
      </div>
    </button>
  )
}
