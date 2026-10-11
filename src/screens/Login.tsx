import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { BackButton } from '../components/controls'
import { maskEmail, PROFILES, ROLES } from '../config'
import { useAuth } from '../data/session'
import { useData } from '../data/store'
import type { Role } from '../data/types'
import { backendKind, getAuth } from '../services'
import { AuthError, type Session } from '../services/backend'
import { lastProfile } from '../services/pin'

const PIN_LENGTH = 4

type Step = { name: 'pick' } | { name: 'pin'; role: Role } | { name: 'verify'; role: Role; reset: boolean } | { name: 'create'; role: Role } | { name: 'confirm'; role: Role; first: string }

/**
 * "Who are you today?" → PIN. First time on a device (or a forgotten PIN): confirm the email
 * with a one-time code, then choose a PIN. Nothing about either person shows before sign-in.
 */
export function Login() {
  const navigate = useNavigate()
  const session = useAuth((s) => s.session)
  const auth = getAuth()
  const [step, setStep] = useState<Step>(() => {
    const last = lastProfile.get()
    return last && auth.hasPin(last) ? { name: 'pin', role: last } : { name: 'pick' }
  })

  useEffect(() => {
    if (session) navigate('/today', { replace: true })
  }, [session, navigate])

  const finish = (s: Session) => {
    lastProfile.set(s.user.role)
    void useData.getState().load(s.user)
    useAuth.getState().setSession(s)
  }

  const pick = (role: Role) => setStep(auth.hasPin(role) ? { name: 'pin', role } : { name: 'verify', role, reset: false })

  if (step.name === 'pick') {
    return (
      <main className="screen no-bar" style={{ display: 'flex', flexDirection: 'column', background: 'var(--wash-login)' }}>
        <div style={{ padding: 'calc(var(--safe-top) + 50px) 32px 0' }}>
          <h1 className="display" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.035em', lineHeight: 1.05, margin: 0 }}>
            Who are you<br />today?
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 22, padding: '62px 32px 0', justifyContent: 'center' }}>
          {ROLES.map((r) => (
            <button key={r} type="button" className="profile-pick" onClick={() => pick(r)} style={{ flex: 1, textAlign: 'center', transition: 'transform .2s' }}>
              <Avatar user={r} size={132} style={{ display: 'block', margin: '0 auto' }} />
              <div className="display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', marginTop: 18 }}>{PROFILES[r].name}</div>
            </button>
          ))}
        </div>
      </main>
    )
  }

  const role = step.role
  const back = () => setStep({ name: 'pick' })

  return (
    <main className="screen no-bar" style={{ display: 'flex', flexDirection: 'column', background: 'var(--wash-login)' }}>
      <div className="pad top-12">
        <BackButton onClick={back} />
      </div>
      <div style={{ paddingTop: 22, textAlign: 'center' }}>
        <Avatar user={role} size={78} style={{ display: 'block', margin: '0 auto' }} />
      </div>
      {step.name === 'pin' && (
        <PinPad
          key={`pin-${role}`}
          title={`Hi ${PROFILES[role].name}`}
          sub="Enter your PIN"
          onComplete={async (pin) => finish(await auth.signInWithPin(role, pin))}
          footer={
            <div style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
              <button type="button" className="link-gold" style={{ fontSize: 13 }} onClick={() => setStep({ name: 'verify', role, reset: true })}>Forgot PIN?</button>
              <button type="button" style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)' }} onClick={back}>Not {PROFILES[role].name}?</button>
            </div>
          }
        />
      )}
      {step.name === 'verify' && <Verify role={role} reset={step.reset} onVerified={() => setStep({ name: 'create', role })} onHavePin={() => setStep({ name: 'pin', role })} />}
      {step.name === 'create' && (
        <PinPad key="create" title="Choose a PIN" sub={`${PIN_LENGTH} digits you’ll use to open Aurelio`} onComplete={async (pin) => setStep({ name: 'confirm', role, first: pin })} />
      )}
      {step.name === 'confirm' && (
        <PinPad
          key="confirm"
          title="Once more"
          sub="Enter the same PIN again"
          onComplete={async (pin) => {
            if (pin !== step.first) throw new AuthError('Those didn’t match. Try again.')
            finish(await auth.setPin(role, pin))
          }}
        />
      )}
    </main>
  )
}

function PinPad({ title, sub, onComplete, footer }: { title: string; sub: string; onComplete: (pin: string) => Promise<void>; footer?: React.ReactNode }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  const press = async (d: string) => {
    if (busy || pin.length >= PIN_LENGTH) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length < PIN_LENGTH) return
    setBusy(true)
    try {
      await onComplete(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setShake((n) => n + 1)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) void press(e.key)
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ textAlign: 'center', padding: '18px 32px 0' }}>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>{title}</h1>
        <div style={{ fontSize: 14, color: 'var(--muted-2)', marginTop: 6 }}>{sub}</div>
      </div>
      <div key={shake} className="pin-dots" style={{ marginTop: 28, animation: shake ? 'pin-shake .3s ease' : undefined }} aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`} role="status">
        {Array.from({ length: PIN_LENGTH }, (_, i) => <span key={i} className={`pin-dot${i < pin.length ? ' on' : ''}`} />)}
      </div>
      <div style={{ minHeight: 22, marginTop: 14, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--clay)' }} aria-live="assertive">{error}</div>
      <div className="pin-pad" style={{ marginTop: 14 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="pin-key" onClick={() => void press(d)} disabled={busy}>{d}</button>
        ))}
        <span />
        <button type="button" className="pin-key" onClick={() => void press('0')} disabled={busy}>0</button>
        <button type="button" className="pin-key ghost" aria-label="Delete" onClick={() => setPin((p) => p.slice(0, -1))}>Delete</button>
      </div>
      {footer && <div style={{ marginTop: 'auto', padding: '24px 32px calc(36px + var(--safe-bottom))' }}>{footer}</div>}
    </div>
  )
}

function Verify({ role, reset, onVerified, onHavePin }: { role: Role; reset: boolean; onVerified: () => void; onHavePin: () => void }) {
  const auth = getAuth()
  const email = PROFILES[role].email
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '18px 32px calc(36px + var(--safe-bottom))' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', margin: 0 }}>{reset ? 'Reset your PIN' : `Welcome, ${PROFILES[role].name}`}</h1>
        <div style={{ fontSize: 14, color: 'var(--muted-2)', marginTop: 8, lineHeight: 1.6 }}>
          {sent ? `Enter the 6-digit code sent to ${maskEmail(email)}.` : `First, a quick check that it’s you. We’ll email a code to ${maskEmail(email)}.`}
        </div>
      </div>
      {sent && (
        <div style={{ marginTop: 26 }}>
          <input className="text-input display" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} aria-label="Code from the email"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••"
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && void run(async () => { await auth.verifyCode(role, code); onVerified() })}
            style={{ fontSize: 34, fontWeight: 700, letterSpacing: '.3em', textAlign: 'center' }} />
          <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 12 }} />
          {auth.codeHint && <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 12, textAlign: 'center' }}>{auth.codeHint}</div>}
        </div>
      )}
      <div style={{ minHeight: 22, marginTop: 14, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--clay)' }} aria-live="assertive">{error}</div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sent ? (
          <>
            <button type="button" className="btn btn-ink" disabled={busy || code.length !== 6} style={{ opacity: code.length === 6 ? 1 : 0.5 }}
              onClick={() => void run(async () => { await auth.verifyCode(role, code); onVerified() })}>
              Verify
            </button>
            <button type="button" style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)', padding: 10 }} disabled={busy}
              onClick={() => void run(async () => { await auth.sendCode(role); setCode('') })}>
              Send a new code
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ink" disabled={busy} onClick={() => void run(async () => { await auth.sendCode(role); setSent(true) })}>
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
            {!reset && backendKind() !== 'local' && (
              <button type="button" style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)', padding: 10 }} onClick={onHavePin}>I already have a PIN</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
