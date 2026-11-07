import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Toggle } from '../components/controls'
import { checklist, NoteMeta, NoteText, photosOf, toggleLine } from '../components/notes'
import { Ori } from '../components/Ori'
import { flash } from '../components/Toast'
import { FormHeader } from '../components/ui'
import { uid, useData } from '../data/store'
import type { Note } from '../data/types'
import { findPlace } from '../lib/place'
import { MAX_PHOTOS, preparePhoto, readNotes, readVoice, takePendingPhotos } from '../lib/scan'
import { MAX_SECONDS, startRecording, toWavBase64 } from '../lib/voice'

type Reading = 'idle' | 'reading' | 'off' | 'failed'

/**
 * One note. An existing note opens to read and tick, with Edit for the rest. A new one may start from
 * photos, which are read into a checklist for Leo to check and keep. New notes take the time and place.
 */
export function NoteEdit() {
  const { id = 'new' } = useParams()
  const existing = useData((s) => s.notes.find((n) => n.id === id))
  const [editing, setEditing] = useState(id === 'new')
  if (id !== 'new' && !existing) return null
  return editing || !existing ? <Editor existing={existing} /> : <Viewer note={existing} onEdit={() => setEditing(true)} />
}

/** Photos side by side, scrolled across when there are several. */
function Photos({ photos, onRemove }: { photos: string[]; onRemove?: (i: number) => void }) {
  if (!photos.length) return null
  return (
    <div className={photos.length > 1 ? 'photo-strip many' : 'photo-strip'}>
      {photos.map((p, i) => (
        <div key={i} className="photo-cell">
          <img src={p} alt={`Page ${i + 1}`} className="photo-thumb" />
          {onRemove && <button type="button" className="photo-x" aria-label={`Remove page ${i + 1}`} onClick={() => onRemove(i)}>×</button>}
        </div>
      ))}
    </div>
  )
}

/** Reading a note: photos, title, where and when, and a checklist to tick. */
function Viewer({ note, onEdit }: { note: Note; onEdit: () => void }) {
  const navigate = useNavigate()
  const saveNote = useData((s) => s.saveNote)
  const goals = checklist(note.body)
  return (
    <main className="screen no-bar" style={{ background: 'var(--wash-default)' }}>
      <div className="pad top-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="glass-btn" aria-label="Back" onClick={() => navigate(-1)} style={{ fontSize: 22 }}>‹</button>
        <button type="button" className="glass-pill" onClick={onEdit} style={{ color: 'var(--gold-text)' }}>Edit</button>
      </div>
      <div className="pad" style={{ paddingTop: 14 }}>
        <Photos photos={photosOf(note)} />
        {note.title && <h1 className="display" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em', margin: '18px 0 0' }}>{note.title}</h1>}
        <NoteMeta note={note} style={{ marginTop: 6 }} />
        {goals && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: goals.done === goals.total ? 'var(--gold-text)' : 'var(--muted-2)' }}>
              {goals.done === goals.total ? 'All goals done' : `${goals.done} of ${goals.total} goals done`}
            </div>
            <div className="keep-bar" aria-hidden="true"><span style={{ width: `${(goals.done / goals.total) * 100}%` }} /></div>
          </div>
        )}
        <div style={{ fontSize: 15.5, marginTop: 10 }}>
          <NoteText body={note.body} onToggle={(i) => saveNote({ ...note, body: toggleLine(note.body, i) })} />
        </div>
      </div>
    </main>
  )
}

function Editor({ existing }: { existing?: Note }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const data = useData()
  const [note, setNote] = useState<Note>(() => existing ?? {
    id: uid(), userId: data.me!.id, title: '', body: '', pinned: true, createdAt: new Date().toISOString(), updatedAt: '',
  })
  // Photos taken or picked on the notes screen, handed over once.
  const [picked] = useState(() => (existing ? [] : takePendingPhotos()))
  const [reading, setReading] = useState<Reading>(picked.length ? 'reading' : 'idle')
  const [source, setSource] = useState<'photo' | 'voice'>('photo')
  const [recorder, setRecorder] = useState(() => !existing && !!params.get('voice'))
  const started = useRef(false)
  const photos = photosOf(note)

  const read = async (files: File[]) => {
    try {
      const pages = await Promise.all(files.slice(0, MAX_PHOTOS).map(preparePhoto))
      // Only a tiny thumbnail of the first page is kept; the pages themselves become text.
      setNote((n) => {
        const images = photosOf(n).length ? photosOf(n) : [pages[0].thumb]
        return { ...n, images, image: images[0] }
      })
      fill(await readNotes(pages.map((p) => p.full)))
    } catch {
      setReading('failed')
    }
  }
  const fill = (out: Awaited<ReturnType<typeof readNotes>>) => {
    if (out === 'off' || out === null) return setReading(out === 'off' ? 'off' : 'failed')
    setNote((n) => ({ ...n, title: n.title || out.title, body: n.body ? `${n.body}\n\n${out.body}` : out.body }))
    setReading('idle')
  }
  const listen = async (audio: Blob) => {
    setSource('voice')
    setReading('reading')
    try {
      fill(await readVoice(await toWavBase64(audio)))
    } catch {
      setReading('failed')
    }
  }
  const scan = (files: File[]) => {
    if (!files.length) return
    setSource('photo')
    setReading('reading')
    void read(files)
  }

  useEffect(() => {
    if (started.current || existing) return
    started.current = true
    if (!picked.length && !params.get('blank') && !params.get('voice')) {
      navigate('/journal?tab=notes', { replace: true })
      return
    }
    if (picked.length) void read(picked)
    void findPlace().then((p) => p && setNote((n) => ({ ...n, ...p })))
  })

  const canSave = !!(note.title.trim() || note.body.trim() || photos.length)
  const save = () => {
    if (!canSave) return
    data.saveNote({ ...note, title: note.title.trim() })
    flash(note.pinned ? 'Saved and pinned to Today' : 'Note saved')
    navigate(-1)
  }
  const removePhoto = (i: number) => setNote((n) => {
    const images = photosOf(n).filter((_, k) => k !== i)
    return { ...n, images, image: images[0] }
  })

  return (
    <main className="screen no-bar" style={{ background: 'var(--wash-default)' }}>
      <FormHeader title={existing ? 'Note' : 'New note'} onCancel={() => navigate(-1)} onSave={save} canSave={canSave && reading !== 'reading'} />
      <div className="pad" style={{ paddingTop: 14 }}>
        <Photos photos={photos} onRemove={removePhoto} />
        {recorder && reading === 'idle' && <Recorder onDone={(a) => { setRecorder(false); void listen(a) }} />}
        {reading !== 'idle' && (
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 15px', marginTop: 12 }}>
            <Ori size={26} animate={reading === 'reading'} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--muted-1)', lineHeight: 1.45 }}>
              {reading === 'reading' ? (source === 'voice' ? 'Turning what you said into a note…' : picked.length > 1 ? `Reading your ${picked.length} pages…` : 'Reading your page…')
                : reading === 'off' ? 'The reader isn’t switched on yet, so type the note in below.'
                : source === 'voice' ? 'I couldn’t make that out. Try again somewhere quieter, or type it below.'
                : 'I couldn’t read that. Try a brighter photo, or type it in below.'}
            </div>
          </div>
        )}
        <input className="text-input display" value={note.title} placeholder="Title" aria-label="Title" onChange={(e) => setNote({ ...note, title: e.target.value })}
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', marginTop: 18 }} />
        <NoteMeta note={note} style={{ marginTop: 4 }} />
        <textarea className="big-text" value={note.body} placeholder={reading === 'reading' ? '' : 'Write here. Start a line with “- [ ] ” for something to tick.'} aria-label="Note"
          onChange={(e) => setNote({ ...note, body: e.target.value })} style={{ marginTop: 12 }} />
        <div className="setting-row" style={{ borderTop: '1px solid var(--divider)', marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Show on Today</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 2 }}>Keeps this note on your home screen</div>
          </div>
          <Toggle on={note.pinned} onChange={(v) => setNote({ ...note, pinned: v })} label="Show on Today" />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 16, flexWrap: 'wrap' }}>
          {!recorder && (
            <button type="button" onClick={() => setRecorder(true)} style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold-text)' }}>Voice note</button>
          )}
          <label style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold-text)', cursor: 'pointer' }}>
            Take a photo
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { scan(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          </label>
          <label style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold-text)', cursor: 'pointer' }}>
            Add photos
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { scan(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          </label>
          {existing && (
            <button type="button" style={{ fontSize: 14, fontWeight: 800, color: 'var(--clay)', marginLeft: 'auto' }}
              onClick={() => { if (window.confirm('Delete this note?')) { data.deleteNote(note.id); navigate('/journal?tab=notes', { replace: true }) } }}>Delete</button>
          )}
        </div>
      </div>
    </main>
  )
}

type Rec = Awaited<ReturnType<typeof startRecording>>

/** Tap to talk, tap again to stop. Stops by itself at the time limit. */
function Recorder({ onDone }: { onDone: (audio: Blob) => void }) {
  const [rec, setRec] = useState<Rec | null>(null)
  const [secs, setSecs] = useState(0)
  const [denied, setDenied] = useState(false)
  const live = useRef<Rec | null>(null)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => () => live.current?.cancel(), [])
  const start = async () => {
    try {
      const r = await startRecording()
      live.current = r
      setSecs(0)
      setRec(r)
    } catch {
      setDenied(true)
    }
  }
  const finish = async () => {
    const r = live.current
    if (!r) return
    live.current = null
    setRec(null)
    done.current(await r.stop())
  }
  useEffect(() => {
    if (!rec) return
    const started = Date.now()
    const t = window.setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000)
      setSecs(s)
      if (s >= MAX_SECONDS) void finish()
    }, 250)
    return () => clearInterval(t)
  }, [rec])
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  return (
    <div className="card recorder">
      <button type="button" className={rec ? 'rec-btn on' : 'rec-btn'} onClick={() => (rec ? void finish() : void start())}
        aria-label={rec ? 'Stop recording' : 'Start recording'}>
        {rec ? <span className="rec-stop" /> : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </svg>
        )}
      </button>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-1)', lineHeight: 1.45, flex: 1 }}>
        {denied ? 'The microphone is blocked. Allow it for this app in your phone’s settings.'
          : rec ? <><span className="rec-dot" /> Listening · {clock}<div style={{ fontSize: 12.5, color: 'var(--muted-3)' }}>Tap to stop</div></>
          : <>Tap and talk through your goals<div style={{ fontSize: 12.5, color: 'var(--muted-3)' }}>Up to {MAX_SECONDS / 60} minutes. Only the text is kept.</div></>}
      </div>
    </div>
  )
}
