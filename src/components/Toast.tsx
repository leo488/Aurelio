import { useEffect } from 'react'
import { create } from 'zustand'
import { Ori } from './Ori'

interface ToastState {
  toast: { text: string; action?: { label: string; run: () => void }; key: number } | null
  flash: (text: string, action?: { label: string; run: () => void }) => void
  clear: () => void
}

export const useToast = create<ToastState>((set) => ({
  toast: null,
  flash: (text, action) => set({ toast: { text, action, key: Date.now() } }),
  clear: () => set({ toast: null }),
}))

export const flash = (text: string, action?: { label: string; run: () => void }) => useToast.getState().flash(text, action)

/** Ink pill above the bar with a small Ori; dismisses itself (longer when it carries Undo). */
export function Toast({ withBar }: { withBar: boolean }) {
  const { toast, clear } = useToast()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clear, toast.action ? 4500 : 2200)
    return () => clearTimeout(t)
  }, [toast, clear])
  if (!toast) return null
  return (
    <div key={toast.key} className="toast" role="status" style={{ bottom: withBar ? 'calc(112px + var(--safe-bottom))' : 'calc(40px + var(--safe-bottom))' }}>
      <Ori size={22} />
      <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{toast.text}</div>
      {toast.action && (
        <button type="button" onClick={() => { toast.action!.run(); clear() }} style={{ color: 'var(--gold)', fontWeight: 800, fontSize: 13.5 }}>
          {toast.action.label}
        </button>
      )}
    </div>
  )
}
