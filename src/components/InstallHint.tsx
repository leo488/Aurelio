import { useState } from 'react'
import { isIOS, isStandalone, safeStorage, useInstallPrompt } from '../lib/install'
import { useMe } from '../data/session'
import { pushSupported, registerPush, syncPushes } from '../services/push'
import { Ori } from './Ori'
import { flash } from './Toast'

const KEY = 'aurelio-install-hint-dismissed'

/** First-run hint to put Aurelio on the home screen: Safari has no prompt, Chrome's is captured. */
export function InstallHint() {
  const { canPrompt, prompt } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(() => safeStorage.get(KEY) === '1')
  if (dismissed || isStandalone() || (!isIOS() && !canPrompt)) return null

  const dismiss = () => {
    safeStorage.set(KEY, '1')
    setDismissed(true)
  }
  return (
    <div className="pad" style={{ paddingTop: 20 }}>
      <div className="ori-card" style={{ alignItems: 'flex-start', animation: 'slide-up .3s ease' }}>
        <Ori size={26} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Keep Aurelio on your Home Screen</div>
          <div style={{ fontSize: 13, color: 'var(--chip-suggest-text)', lineHeight: 1.45, marginTop: 3 }}>
            {isIOS() ? 'Tap Share, then Add to Home Screen. Reminders only work once it’s there.' : 'It opens full screen and works offline.'}
          </div>
          {canPrompt && (
            <button type="button" className="pill-ink" style={{ marginTop: 10, display: 'inline-block' }} onClick={async () => (await prompt()) && dismiss()}>
              Install
            </button>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" style={{ color: 'var(--muted-3)', fontSize: 15, padding: '0 2px' }}>✕</button>
      </div>
    </div>
  )
}

const PUSH_KEY = 'aurelio-push-hint-dismissed'

/** Once installed (or on Android), ask for reminders where they matter: on Today, with a reason. */
export function PushHint() {
  const { me } = useMe()
  const [hidden, setHidden] = useState(() => safeStorage.get(PUSH_KEY) === '1' || !pushSupported() || Notification.permission !== 'default' || (isIOS() && !isStandalone()))
  if (hidden) return null
  const dismiss = () => {
    safeStorage.set(PUSH_KEY, '1')
    setHidden(true)
  }
  const allow = async () => {
    const p = await Notification.requestPermission()
    setHidden(true)
    if (p === 'granted') {
      flash('Reminders on')
      if (await registerPush(me)) await syncPushes(me)
    }
  }
  return (
    <div className="pad" style={{ paddingTop: 20 }}>
      <div className="ori-card" style={{ alignItems: 'flex-start', animation: 'slide-up .3s ease' }}>
        <Ori size={26} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Turn on reminders</div>
          <div style={{ fontSize: 13, color: 'var(--chip-suggest-text)', lineHeight: 1.45, marginTop: 3 }}>
            {me.role === 'leo' ? 'Get a nudge before each routine, even when the app is closed.' : 'Get your task reminders and the morning summary, even when the app is closed.'}
          </div>
          <button type="button" className="pill-ink" style={{ marginTop: 10, display: 'inline-block' }} onClick={() => void allow()}>Allow</button>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" style={{ color: 'var(--muted-3)', fontSize: 15, padding: '0 2px' }}>✕</button>
      </div>
    </div>
  )
}
