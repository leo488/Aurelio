/** A short tick on Android when something is checked or completed. iOS has no vibration API and ignores it. */
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
  } catch {
    /* not allowed here */
  }
}
