import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/** Bottom sheet: 40% ink scrim, paper sheet with a grabber. Tap the scrim (or Escape) to close. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="sheet-scrim" aria-label="Close" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grabber" />
        {children}
      </div>
    </div>,
    document.body,
  )
}
