import { Link, useNavigate } from 'react-router-dom'
import { NoteText } from '../components/notes'
import { Ori } from '../components/Ori'
import { PlusButton, ScreenHeader } from '../components/ui'
import { useData } from '../data/store'
import { MONTHS_SHORT } from '../lib/date'
import { setPendingPhoto } from '../lib/scan'

const when = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** The button that opens the camera (or photos) and goes on to read the page. */
export function SnapButton({ label = 'Snap a page of your notepad' }: { label?: string }) {
  const navigate = useNavigate()
  return (
    <label className="snap-btn">
      <Ori size={30} />
      <span style={{ flex: 1 }}>{label}</span>
      <span aria-hidden="true" style={{ fontSize: 18 }}>›</span>
      <input type="file" accept="image/*" hidden onChange={(e) => {
        const f = e.target.files?.[0]
        if (!f) return
        setPendingPhoto(f)
        navigate('/notes/new')
      }} />
    </label>
  )
}

/** Leo's notes: snapped from his notepad or typed. Pinned ones show on Today. */
export function Notes() {
  const notes = useData((s) => s.notes)
  const navigate = useNavigate()
  return (
    <main className="screen" style={{ background: 'var(--wash-default)' }}>
      <ScreenHeader title="Notes" sub={notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : undefined}
        right={<PlusButton label="New note" onClick={() => navigate('/notes/new?blank=1')} />} />
      <div className="pad" style={{ paddingTop: 16 }}>
        <SnapButton />
        {notes.map((n) => (
          <Link key={n.id} to={`/notes/${n.id}`} className="card note-row">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ flex: 1, fontSize: 15.5, fontWeight: 800 }}>{n.title || 'Untitled'}</div>
              {n.pinned && <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-text)' }}>ON TODAY</span>}
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-3)' }}>{when(n.updatedAt)}</span>
            </div>
            <NoteText body={n.body} lines={3} />
          </Link>
        ))}
        {notes.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted-2)', padding: '16px 0', lineHeight: 1.5 }}>Your notes will be here. Snap your goals page and it turns into a note you can pin to Today.</div>}
      </div>
    </main>
  )
}
