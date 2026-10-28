import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Toggle } from '../components/controls'
import { Ori } from '../components/Ori'
import { flash } from '../components/Toast'
import { FormHeader } from '../components/ui'
import { uid, useData } from '../data/store'
import type { Note } from '../data/types'
import { preparePhoto, readNotes, takePendingPhoto } from '../lib/scan'

type Reading = 'idle' | 'reading' | 'off' | 'failed'

/** One note. A new one may start from a photo, which is read into text for Leo to check and keep. */
export function NoteEdit() {
  const { id = 'new' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const data = useData()
  const existing = data.notes.find((n) => n.id === id)
  const [note, setNote] = useState<Note>(() => existing ?? {
    id: uid(), userId: data.me!.id, title: '', body: '', pinned: true, createdAt: new Date().toISOString(), updatedAt: '',
  })
  // A photo picked from the bar or the notes list, handed over once.
  const [picked] = useState(() => (id === 'new' ? takePendingPhoto() : null))
  const [reading, setReading] = useState<Reading>(picked ? 'reading' : 'idle')
  const started = useRef(false)

  const read = async (file: File) => {
    try {
      const { full, thumb } = await preparePhoto(file)
      setNote((n) => ({ ...n, image: thumb }))
      const out = await readNotes(full)
      if (out === 'off' || out === null) return setReading(out === 'off' ? 'off' : 'failed')
      setNote((n) => ({ ...n, title: n.title || out.title, body: n.body ? `${n.body}\n\n${out.body}` : out.body }))
      setReading('idle')
    } catch {
      setReading('failed')
    }
  }

  const scan = (file: File) => {
    setReading('reading')
    void read(file)
  }

  useEffect(() => {
    if (started.current || id !== 'new') return
    started.current = true
    if (picked) void read(picked)
    else if (!params.get('blank')) navigate('/notes', { replace: true })
  })

  if (id !== 'new' && !existing) return null
  const canSave = !!(note.title.trim() || note.body.trim() || note.image)
  const save = () => {
    if (!canSave) return
    data.saveNote({ ...note, title: note.title.trim() })
    flash(note.pinned ? 'Saved and pinned to Today' : 'Note saved')
    navigate(-1)
  }

  return (
    <main className="screen no-bar" style={{ background: 'var(--wash-default)' }}>
      <FormHeader title={existing ? 'Note' : 'New note'} onCancel={() => navigate(-1)} onSave={save} canSave={canSave && reading !== 'reading'} />
      <div className="pad" style={{ paddingTop: 14 }}>
        {note.image && <img src={note.image} alt="The page you snapped" className="photo-thumb" />}
        {reading !== 'idle' && (
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 15px', marginTop: 12 }}>
            <Ori size={26} animate={reading === 'reading'} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--muted-1)', lineHeight: 1.45 }}>
              {reading === 'reading' ? 'Reading your page…'
                : reading === 'off' ? 'The photo reader isn’t switched on yet, so type the page in below. It will read photos once the Gemini key is added.'
                : 'I couldn’t read that page. Try a brighter photo, or type it in below.'}
            </div>
          </div>
        )}
        <input className="text-input display" value={note.title} placeholder="Title" aria-label="Title" onChange={(e) => setNote({ ...note, title: e.target.value })}
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', marginTop: 18 }} />
        <textarea className="big-text" value={note.body} placeholder={reading === 'reading' ? '' : 'Write here. Start a line with “- ” for a list.'} aria-label="Note"
          onChange={(e) => setNote({ ...note, body: e.target.value })} style={{ marginTop: 12 }} />
        <div className="setting-row" style={{ borderTop: '1px solid var(--divider)', marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Show on Today</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>Keeps this note on your home screen</div>
          </div>
          <Toggle on={note.pinned} onChange={(v) => setNote({ ...note, pinned: v })} label="Show on Today" />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 16 }}>
          <label style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold-text)', cursor: 'pointer' }}>
            {note.image ? 'Read another page' : 'Add a photo'}
            <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) scan(f) }} />
          </label>
          {existing && (
            <button type="button" style={{ fontSize: 14, fontWeight: 800, color: 'var(--clay)', marginLeft: 'auto' }}
              onClick={() => { if (window.confirm('Delete this note?')) { data.deleteNote(note.id); navigate('/notes', { replace: true }) } }}>Delete</button>
          )}
        </div>
      </div>
    </main>
  )
}
