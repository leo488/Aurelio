import { useSupabase } from '../config'

// Notepad photos: shrunk on the phone, then read into text by the `scan` function (Gemini).

/** The photo picked from the bar's Ori button, waiting for the note screen to open. */
let pending: File | null = null
export const setPendingPhoto = (f: File | null) => { pending = f }
export const takePendingPhoto = () => {
  const f = pending
  pending = null
  return f
}

async function draw(file: File, max: number, quality: number) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvas.toDataURL('image/jpeg', quality)
}

/** A sharp copy for reading (base64, no prefix) and a small one to keep with the note. */
export async function preparePhoto(file: File) {
  const [full, thumb] = await Promise.all([draw(file, 1800, 0.85), draw(file, 560, 0.68)])
  return { full: full.slice(full.indexOf(',') + 1), thumb }
}

/** The page as text. 'off' when no AI key is set up; null when it couldn't be read. */
export async function readNotes(image: string): Promise<{ title: string; body: string } | 'off' | null> {
  if (!useSupabase || (typeof navigator !== 'undefined' && !navigator.onLine)) return useSupabase ? null : 'off'
  try {
    const sb = (await import('../services/supabase/supabaseBackend')).getSupabase()
    if (!sb) return null
    const { data, error } = await sb.functions.invoke('scan', { body: { image } })
    if (error) {
      const status = (error as { context?: Response }).context?.status
      return status === 503 ? 'off' : null
    }
    return data && typeof data.body === 'string' ? { title: String(data.title ?? ''), body: data.body } : null
  } catch {
    return null
  }
}
