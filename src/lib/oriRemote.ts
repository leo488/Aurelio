import { useSupabase } from '../config'

/**
 * Ask the AI behind Ori. In database mode this is the `ori` function (Claude, signed in as the
 * member); otherwise VITE_ORI_ENDPOINT if one is set. Null when offline, unconfigured or failing,
 * so callers fall back to the local parser.
 */
export async function askOri<T>(body: Record<string, unknown>): Promise<T | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null
  try {
    if (useSupabase) {
      const sb = (await import('../services/supabase/supabaseBackend')).getSupabase()
      if (!sb) return null
      const { data, error } = await sb.functions.invoke('ori', { body })
      return error ? null : (data as T)
    }
    const endpoint = import.meta.env.VITE_ORI_ENDPOINT as string | undefined
    if (!endpoint) return null
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}
