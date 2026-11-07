import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checklist, matches, NoteCard, photosOf } from '../components/notes'
import { Icon } from '../components/Icon'
import { useData } from '../data/store'
import type { Note } from '../data/types'
import { MAX_PHOTOS, setPendingPhotos } from '../lib/scan'

type Filter = 'all' | 'goals' | 'open' | 'photos'
const FILTERS: [Filter, string][] = [['all', 'All'], ['goals', 'Goals'], ['open', 'Goals left'], ['photos', 'Photos']]
const keep: Record<Filter, (n: Note) => boolean> = {
  all: () => true,
  goals: (n) => !!checklist(n.body),
  open: (n) => { const c = checklist(n.body); return !!c && c.done < c.total },
  photos: (n) => photosOf(n).length > 0,
}

/** Grid or list, remembered on this phone. */
const LAYOUT_KEY = 'aurelio:notes-layout'
const readLayout = () => {
  try { return localStorage.getItem(LAYOUT_KEY) === 'list' } catch { return false }
}

/** Leo's notes, laid out like Keep: search on top, pinned notes first, then the rest, and a + to add one. */
export function NotesList() {
  const notes = useData((s) => s.notes)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [list, setList] = useState(readLayout)
  const shown = notes.filter((n) => keep[filter](n) && matches(n, q.trim()))
  const pinned = shown.filter((n) => n.pinned)
  const others = shown.filter((n) => !n.pinned)
  const flip = () => {
    setList(!list)
    try { localStorage.setItem(LAYOUT_KEY, list ? 'grid' : 'list') } catch { /* private mode: just this visit */ }
  }
  const grid = (items: Note[]) => <div className={list ? 'keep-grid list' : 'keep-grid'}>{items.map((n) => <NoteCard key={n.id} note={n} />)}</div>

  return (
    <div className="pad" style={{ paddingTop: 14 }}>
      <div className="search">
        <SearchIcon />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your notes" aria-label="Search notes" enterKeyHint="search" />
        <button type="button" onClick={flip} aria-label={list ? 'Show as a grid' : 'Show as a list'} style={{ lineHeight: 0, padding: 6, margin: -6, color: 'var(--muted-1)' }}>
          {list ? <GridIcon /> : <ListIcon />}
        </button>
      </div>
      {notes.length > 0 && (
        <div className="filters" role="group" aria-label="Show">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" className={filter === k ? 'filter on' : 'filter'} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      )}
      {pinned.length > 0 && <><div className="keep-section">Pinned</div>{grid(pinned)}</>}
      {others.length > 0 && <>{pinned.length > 0 && <div className="keep-section">Others</div>}{grid(others)}</>}
      {notes.length > 0 && shown.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '18px 0' }}>No notes match.</div>}
      {notes.length === 0 && (
        <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '18px 0', lineHeight: 1.5 }}>Tap + to snap your notepad, talk a note through, or type one. Goals become boxes you can tick.</div>
      )}
      <AddNote />
    </div>
  )
}

/** The round + in the corner, opening onto the ways to start a note. */
function AddNote() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const go = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setOpen(false)
    if (!files.length) return
    setPendingPhotos(files)
    navigate('/notes/new')
  }
  return (
    <>
      {open && <div className="fab-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="fab-wrap">
        {open && (
          <div className="fab-menu" role="menu">
            <button type="button" role="menuitem" className="fab-item" onClick={() => navigate('/notes/new?voice=1')}><MicIcon />Voice note</button>
            <label role="menuitem" className="fab-item"><CameraIcon />Take a photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={go} />
            </label>
            <label role="menuitem" className="fab-item" aria-label={`Photos, up to ${MAX_PHOTOS}`}><PhotosIcon />Photos
              <input type="file" accept="image/*" multiple hidden onChange={go} />
            </label>
            <button type="button" role="menuitem" className="fab-item" onClick={() => navigate('/notes/new?blank=1')}><TextIcon />Text note</button>
          </div>
        )}
        <button type="button" className={open ? 'fab on' : 'fab'} aria-label={open ? 'Close' : 'New note'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="plus" size={26} stroke={2.2} color="var(--on-gold)" />
        </button>
      </div>
    </>
  )
}

const svg = (children: React.ReactNode) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const SearchIcon = () => svg(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>)
const GridIcon = () => svg(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>)
const ListIcon = () => svg(<><rect x="4" y="4.5" width="16" height="6" rx="1.8" /><rect x="4" y="13.5" width="16" height="6" rx="1.8" /></>)
const MicIcon = () => svg(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>)
const CameraIcon = () => svg(<><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" /><circle cx="12" cy="12.5" r="3.4" /></>)
const PhotosIcon = () => svg(<><rect x="3" y="5" width="15" height="14" rx="2.5" /><path d="M3 15l4-4 4 4 3-3 4 4" /><path d="M7 3h12a2 2 0 0 1 2 2v11" /></>)
const TextIcon = () => svg(<path d="M5 6h14M5 11h14M5 16h9" />)
