import { useState } from 'react'
import { isIOS, isStandalone } from '../lib/install'
import { Ori } from './Ori'

/** Soft prompt shown before the browser's own permission dialog (never on load). */
export function NotifyPrompt() {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [perm, setPerm] = useState(supported ? Notification.permission : 'denied')
  const needsInstall = isIOS() && !isStandalone()
  if (!needsInstall && (!supported || perm !== 'default')) return null
  return (
    <div className="ori-card" style={{ alignItems: 'flex-start', marginTop: 20 }}>
      <Ori size={26} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Want me to remind you?</div>
        <div style={{ fontSize: 13, color: 'var(--chip-suggest-text)', lineHeight: 1.45, marginTop: 3 }}>
          {needsInstall
            ? 'On iPhone, reminders arrive once Aurelio is on your Home Screen. Tap Share, then Add to Home Screen.'
            : 'Reminders for what you’ve planned, and nudges from each other. Nothing during quiet hours.'}
        </div>
        {!needsInstall && (
          <button type="button" className="pill-ink" style={{ marginTop: 10, display: 'inline-block' }}
            onClick={async () => setPerm(await Notification.requestPermission())}>
            Turn on reminders
          </button>
        )}
      </div>
    </div>
  )
}
