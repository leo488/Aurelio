import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { checklist, matches, NoteCard, photosOf } from '../components/notes'
import { Icon } from '../components/Icon'
import type { Note } from '../data/types'
import { useData } from '../data/store'
import { MAX_PHOTOS, setPendingPhotos } from '../lib/scan'

/** Take a photo with the camera, or pick several pages from the gallery; either goes on to read them. */
export function PhotoButtons() {
  const navigate = useNavigate()
  const go = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setPendingPhotos(files)
    navigate('/notes/new')
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <label className="glass-pill gold-pill" style={{ flex: 1, minWidth: 0, justifyContent: 'center', cursor: 'pointer' }}>
        <CameraIcon />
        <span style={{ whiteSpace: 'nowrap' }}>Take a photo</span>
        <input type="file" accept="image/*" capture="environment" hidden onChange={go} />
      </label>
      <label className="glass-pill" aria-label={`Choose up to ${MAX_PHOTOS} photos`} style={{ cursor: 'pointer' }}>
        <PhotosIcon />
        <span>Photos</span>
        <input type="file" accept="image/*" multiple hidden onChange={go} />
      </label>
      <button type="button" className="glass-btn" aria-label="New note" onClick={() => navigate('/notes/new?blank=1')}>
        <Icon name="plus" size={19} stroke={1.9} />
      </button>
    </div>
  )
}

const CameraIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" />
    <circle cx="12" cy="12.5" r="3.4" />
  </svg>
)

const PhotosIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="15" height="14" rx="2.5" />
    <path d="M3 15l4-4 4 4 3-3 4 4" />
    <path d="M7 3h12a2 2 0 0 1 2 2v11" />
  </svg>
)

type Filter = 'all' | 'goals' | 'open' | 'photos' | 'today'
const FILTERS: [Filter, string][] = [['all', 'All'], ['goals', 'Goals'], ['open', 'Goals left'], ['photos', 'Photos'], ['today', 'On Today']]
const keep: Record<Filter, (n: Note) => boolean> = {
  all: () => true,
  goals: (n) => !!checklist(n.body),
  open: (n) => { const c = checklist(n.body); return !!c && c.done < c.total },
  photos: (n) => photosOf(n).length > 0,
  today: (n) => n.pinned,
}

/** Leo's notes as a grid of cards, like Keep, with search and filters. Pinned ones show on Today. */
export function NotesList() {
  const notes = useData((s) => s.notes)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const shown = notes.filter((n) => keep[filter](n) && matches(n, q.trim()))
  return (
    <div className="pad" style={{ paddingTop: 14 }}>
      <PhotoButtons />
      {notes.length > 0 && (
        <>
          <label className="search" style={{ marginTop: 12 }}>
            <SearchIcon />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" enterKeyHint="search" />
          </label>
          <div className="filters" role="group" aria-label="Show">
            {FILTERS.map(([k, label]) => (
              <button key={k} type="button" className={filter === k ? 'filter on' : 'filter'} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
        </>
      )}
      {shown.length > 0 && <div className="keep-grid">{shown.map((n) => <NoteCard key={n.id} note={n} />)}</div>}
      {notes.length > 0 && shown.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '18px 0' }}>No notes match.</div>}
      {notes.length === 0 && (
        <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '16px 0', lineHeight: 1.5 }}>Your notes will be here. Snap your goals page and it turns into goals you can tick off, and pin to Today.</div>
      )}
    </div>
  )
}

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
  </svg>
)
