import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Ori } from '../components/Ori'
import { PROFILES, ROLES } from '../config'
import { useMe } from '../data/session'
import { useData } from '../data/store'
import { logicalToday } from '../lib/date'
import { parseLocal, summarize } from '../lib/ori'
import { answer, parseMove } from '../lib/oriChat'
import { isRoutineRequest } from '../lib/oriApply'

interface Msg { me: boolean; text: string; id: number }

const SUGGESTIONS = { leo: ['How’s my streak?', 'What’s left today?', 'Make my evening lighter'], sonia: ['What’s on tomorrow?', 'Move my 2pm to Friday', 'What did I finish this week?'] }

export function OriChat() {
  const { me } = useMe()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string; summary?: string } | null)?.from
  const [chat, setChat] = useState<Msg[]>(() =>
    from ? [{ me: true, text: from, id: 1 }, { me: false, text: 'Tell me what to change and I’ll sort it again.', id: 2 }] : [],
  )
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [chat])

  const send = (msg: string) => {
    const t = msg.trim()
    if (!t) return
    setText('')
    setChat((c) => [...c, { me: true, text: t, id: Date.now() }])
    setTimeout(() => {
      const s = useData.getState()
      const moved = me.role === 'sonia' ? parseMove(t, s) : null
      if (moved?.taskId) s.updateTask(moved.taskId, { date: moved.date })
      let reply = moved ? moved.reply : answer(t, s, me)
      if (!reply && me.role === 'leo' && isRoutineRequest(t)) {
        reply = 'I’ll draft that so you can check it before saving.'
        setTimeout(() => navigate('/ori', { replace: true, state: { text: t } }), 900)
      } else if (!reply) {
        const ctx = { today: logicalToday(), now: new Date(), routines: s.routines.map((r) => ({ id: r.id, name: r.name })), names: ROLES.map((r) => PROFILES[r].name) }
        const request = from ? `${from}, ${t}` : t
        const items = parseLocal(t, ctx)
        if (items.length) {
          reply = `${summarize(items)}. Opening the list so you can check it.`
          setTimeout(() => navigate('/ori', { replace: true, state: { text: from && /\b(change|instead|actually|make it|move)\b/i.test(t) ? request : t } }), 900)
        } else {
          reply = 'I can help with routines, tasks, events and deadlines. Ask about your streak, or tell me something to add.'
        }
      }
      setChat((c) => [...c, { me: false, text: reply!, id: Date.now() + 1 }])
    }, 700)
  }

  return (
    <main className="screen no-bar" style={{ height: '100dvh', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'calc(var(--safe-top) + 12px) 26px 16px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--divider)' }}>
        <Ori size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Ori</div>
          <div style={{ fontSize: 12, color: 'var(--olive)', fontWeight: 700 }}>Sees only your own data</div>
        </div>
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/today'))} style={{ fontSize: 13.5, color: 'var(--muted-2)', fontWeight: 700 }}>Close</button>
      </div>

      <div style={{ flex: 1, padding: '20px 26px 0', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }} aria-live="polite">
        {chat.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px 0' }}>
            <Ori size={76} animate style={{ display: 'inline-block' }} />
            <div className="display" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', marginTop: 20 }}>Ask me anything about your day</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted-2)', marginTop: 8, lineHeight: 1.6 }}>Try a suggestion or type below.</div>
          </div>
        )}
        {chat.map((m) =>
          m.me ? (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end', animation: 'slide-up .25s ease' }}>
              <div style={{ maxWidth: '78%', background: 'var(--ink)', color: 'var(--paper)', borderRadius: '20px 20px 6px 20px', padding: '13px 16px', fontSize: 14.5, lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ) : (
            <div key={m.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-end', maxWidth: '90%', animation: 'slide-up .25s ease' }}>
              <Ori size={24} />
              <div style={{ background: 'var(--chip-alt)', borderRadius: '20px 20px 20px 6px', padding: '14px 16px', fontSize: 14.5, lineHeight: 1.55 }}>{m.text}</div>
            </div>
          ),
        )}
        <div ref={end} />
      </div>

      <div style={{ padding: '12px 22px 0', display: 'flex', gap: 7, overflowX: 'auto', flex: '0 0 auto' }}>
        {SUGGESTIONS[me.role].map((s) => <button key={s} type="button" className="chip soft" style={{ flex: '0 0 auto' }} onClick={() => send(s)}>{s}</button>)}
      </div>
      <form style={{ padding: '14px 22px calc(36px + var(--safe-bottom) * .5)', flex: '0 0 auto' }} onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--white)', border: '1px solid var(--input-line)', borderRadius: 22, padding: '7px 7px 7px 16px' }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message Ori" aria-label="Message Ori"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--ink)', padding: '8px 0' }} />
          <button type="submit" style={{ background: 'var(--chip)', color: 'var(--ink)', fontSize: 12.5, fontWeight: 800, padding: '10px 13px', borderRadius: 16 }}>Send</button>
          <button type="button" aria-label="Speak to Ori" onClick={() => navigate('/ori', { replace: true })} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <div style={{ width: 11, height: 16, borderRadius: 6, background: 'var(--gold)' }} />
          </button>
        </div>
      </form>
    </main>
  )
}
