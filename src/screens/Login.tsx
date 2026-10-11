import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppMark } from '../components/AppMark'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { maskEmail, PROFILES, ROLES } from '../config'
import { useAuth } from '../data/session'
import { useData } from '../data/store'
import type { Role } from '../data/types'
import { backendKind, getAuth } from '../services'
import { AuthError, type Session } from '../services/backend'
import { lastProfile } from '../services/pin'
import { haptic } from '../lib/haptics'

const PIN_LENGTH = 4

type Step = { name: 'pick' } | { name: 'pin'; role: Role } | { name: 'verify'; role: Role; reset: boolean } | { name: 'create'; role: Role; mismatch?: boolean } | { name: 'confirm'; role: Role; first: string }

/**
 * "Who are you?" → PIN. First time on a device (or a forgotten PIN): confirm the email
 * with a one-time code, then create a PIN. Nothing about either person shows before sign-in.
 */
export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuth((s) => s.session)
  const auth = getAuth()
  const [step, setStep] = useState<Step>(() => {
    // Profile → Change PIN signs out and lands here to confirm the email again.
    const reset = (location.state as { reset?: Role } | null)?.reset
    if (reset) return { name: 'verify', role: reset, reset: true }
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
        <div style={{ padding: 'calc(var(--safe-top) + 54px) 32px 0' }}>
          <AppMark size={30} />
          <h1 className="display" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.035em', lineHeight: 1.05, margin: '22px 0 0' }}>Who are you?</h1>
        </div>
        <div style={{ display: 'flex', gap: 22, padding: '64px 32px 0', justifyContent: 'center' }}>
          {ROLES.map((r) => (
            <button key={r} type="button" className="profile-pick" onClick={() => pick(r)} style={{ flex: 1, textAlign: 'center', transition: 'transform .2s' }}>
              <Avatar user={r} size={132} style={{ display: 'block', margin: '0 auto' }} />
              <div className="display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', marginTop: 18 }}>{PROFILES[r].name}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '0 32px calc(46px + var(--safe-bottom))', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--muted-3)' }}>
          <Icon name="lock" size={16} stroke={1.7} color="var(--muted-3)" />
          <div style={{ fontSize: 13, fontWeight: 600 }}>Private to {PROFILES.leo.name} and {PROFILES.sonia.name}</div>
        </div>
      </main>
    )
  }

  const role = step.role
  const back = () => setStep({ name: 'pick' })
  const email = maskEmail(PROFILES[role].email)

  return (
    <main className="screen no-bar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--wash-pin)' }}>
      <div style={{ alignSelf: 'stretch', padding: 'calc(var(--safe-top) + 10px) 26px 0' }}>
        <button type="button" onClick={back} aria-label="Back" style={{ fontSize: 20, lineHeight: 1, color: 'var(--ink)' }}>‹</button>
      </div>
      <Avatar user={role} size={76} style={{ marginTop: 14, filter: 'var(--glow-avatar)' }} />
      {step.name === 'pin' && (
        <PinPad
          key={`pin-${role}`}
          title="Enter your PIN"
          sub={`Hi ${PROFILES[role].name}.`}
          onComplete={async (pin) => finish(await auth.signInWithPin(role, pin))}
          footer={<button type="button" onClick={() => setStep({ name: 'verify', role, reset: true })} style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-text)' }}>Forgot PIN? Email me a sign-in link</button>}
        />
      )}
      {step.name === 'verify' && <Verify role={role} reset={step.reset} onVerified={() => setStep({ name: 'create', role })} onHavePin={() => setStep({ name: 'pin', role })} />}
      {step.name === 'create' && (
        <PinPad key={`create-${step.mismatch ? 'again' : 'first'}`} title={`Create a ${PIN_LENGTH}-digit PIN`} sub={`First time on this device. We confirmed ${email}.`}
          initialError={step.mismatch ? 'Those didn’t match. Start again.' : ''}
          onComplete={async (pin) => setStep({ name: 'confirm', role, first: pin })} />
      )}
      {step.name === 'confirm' && (
        <PinPad
          key="confirm"
          title="Confirm your PIN"
          sub="Type it once more."
          onComplete={async (pin) => {
            if (pin !== step.first) return setStep({ name: 'create', role, mismatch: true })
            finish(await auth.setPin(role, pin))
          }}
        />
      )}
    </main>
  )
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

function PinPad({ title, sub, onComplete, footer, initialError = '' }: { title: string; sub: string; onComplete: (pin: string) => Promise<void>; footer?: React.ReactNode; initialError?: string }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(initialError)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(initialError ? 1 : 0)

  const press = async (d: string) => {
    if (busy || pin.length >= PIN_LENGTH) return
    const next = pin + d
    haptic()
    setPin(next)
    setError('')
    if (next.length < PIN_LENGTH) return
    setBusy(true)
    // A short beat so the fourth dot is seen filling before anything changes.
    await new Promise((r) => setTimeout(r, 200))
    try {
      await onComplete(next)
    } catch (e) {
      setError(e instanceof AuthError && e.code === 'wrong-pin' ? 'That’s not it. Try again.' : e instanceof Error ? e.message : 'Something went wrong.')
      setShake((n) => n + 1)
      setPin('')
    } finally {
      setBusy(false)
    }
  }
  const del = () => {
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) void press(e.key)
      else if (e.key === 'Backspace') del()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <h1 className="display" style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-.03em', margin: '18px 0 0' }}>{title}</h1>
      <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 7, textAlign: 'center', lineHeight: 1.5, maxWidth: 270 }}>{sub}</div>
      <div key={shake} style={{ display: 'flex', gap: 18, marginTop: 30, animation: shake && error ? 'shake .4s ease' : undefined }} aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`} role="status">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', boxSizing: 'border-box', transition: 'background .15s', ...(i < pin.length ? { background: 'var(--ink)' } : { border: `1.8px solid ${error ? 'var(--clay)' : 'var(--sand)'}` }) }} />
        ))}
      </div>
      <div style={{ height: 20, marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--clay)' }} aria-live="assertive">{error}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 76px)', gap: '14px 26px', marginTop: 16 }}>
        {KEYS.map((k, i) =>
          k === '' ? <span key={i} /> : (
            <button key={i} type="button" className="pin-key" aria-label={k === 'del' ? 'Delete' : k} disabled={busy && k !== 'del'}
              onClick={() => (k === 'del' ? del() : void press(k))}
              style={{ fontSize: k === 'del' ? 20 : 27, background: k === 'del' ? 'transparent' : undefined }}>
              {k === 'del' ? '⌫' : k}
            </button>
          ),
        )}
      </div>
      <div style={{ marginTop: 'auto', paddingBottom: 'calc(40px + var(--safe-bottom))', paddingTop: 20 }}>{footer}</div>
    </>
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
  const verify = () => void run(async () => { await auth.verifyCode(role, code); onVerified() })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, alignSelf: 'stretch', padding: '0 32px calc(40px + var(--safe-bottom))' }}>
      <h1 className="display" style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-.03em', margin: '18px 0 0' }}>{reset ? 'Reset your PIN' : `Hi ${PROFILES[role].name}`}</h1>
      <div style={{ fontSize: 13.5, color: 'var(--muted-1)', marginTop: 7, textAlign: 'center', lineHeight: 1.5, maxWidth: 270 }}>
        {sent ? `Enter the 6-digit code sent to ${maskEmail(email)}.` : `First, a quick check that it’s you. We’ll email a code to ${maskEmail(email)}.`}
      </div>
      {sent && (
        <div style={{ marginTop: 30, alignSelf: 'stretch' }}>
          <input className="text-input display" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} aria-label="Code from the email"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••"
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
            style={{ fontSize: 34, fontWeight: 700, letterSpacing: '.3em', textAlign: 'center' }} />
          <div style={{ height: 1, background: 'var(--divider-confirm)', marginTop: 12 }} />
          {auth.codeHint && <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 12, textAlign: 'center' }}>{auth.codeHint}</div>}
        </div>
      )}
      <div style={{ height: 20, marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--clay)' }} aria-live="assertive">{error}</div>
      <div style={{ marginTop: 'auto', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sent ? (
          <>
            <button type="button" className="btn btn-ink" disabled={busy || code.length !== 6} style={{ opacity: code.length === 6 ? 1 : 0.5 }} onClick={verify}>Verify</button>
            <button type="button" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-text)', padding: 10 }} disabled={busy}
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
              <button type="button" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-text)', padding: 10 }} onClick={onHavePin}>I already have a PIN</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
