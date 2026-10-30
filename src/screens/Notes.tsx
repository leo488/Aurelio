import { useNavigate } from 'react-router-dom'
import { NoteCard } from '../components/notes'
import { Ori } from '../components/Ori'
import { PlusButton } from '../components/ui'
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
    <div style={{ display: 'flex', gap: 8 }}>
      <label className="snap-btn" style={{ flex: 1, minWidth: 0 }}>
        <Ori size={24} />
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Take a photo</span>
        <input type="file" accept="image/*" capture="environment" hidden onChange={go} />
      </label>
      <label className="snap-btn soft" aria-label={`Choose up to ${MAX_PHOTOS} photos`}>
        <PhotosIcon />
        <span>Photos</span>
        <input type="file" accept="image/*" multiple hidden onChange={go} />
      </label>
    </div>
  )
}

const PhotosIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="15" height="14" rx="2.5" />
    <path d="M3 15l4-4 4 4 3-3 4 4" />
    <path d="M7 3h12a2 2 0 0 1 2 2v11" />
  </svg>
)

/** Leo's notes as a grid of cards, like Keep: snapped from his notepad or typed. Pinned ones show on Today. */
export function NotesList() {
  const notes = useData((s) => s.notes)
  const navigate = useNavigate()
  return (
    <div className="pad" style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}><PhotoButtons /></div>
        <PlusButton label="New note" onClick={() => navigate('/notes/new?blank=1')} />
      </div>
      {notes.length > 0 ? (
        <div className="keep-grid">{notes.map((n) => <NoteCard key={n.id} note={n} />)}</div>
      ) : (
        <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '16px 0', lineHeight: 1.5 }}>Your notes will be here. Snap your goals page and it turns into a checklist you can pin to Today.</div>
      )}
    </div>
  )
}
