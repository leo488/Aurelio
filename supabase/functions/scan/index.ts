// Reads photos of handwritten notes (Leo's notepad) into a checklist with Google's Gemini (free tier).
//   { images: base64 JPEG[] } (or one { image })  → { title, body }, body's items as "- [ ] " lines
// Without GEMINI_API_KEY it answers 503 and the app lets him type the notes under the photo.
import { cors, json, memberFrom } from '../_shared/common.ts'

const KEY = Deno.env.get('GEMINI_API_KEY')
// Tried in order: a model that's gone or busy falls through to the next.
const MODELS = [Deno.env.get('GEMINI_MODEL'), 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'].filter(Boolean) as string[]

const PROMPT = `These are photos of handwritten or printed notes, usually goals or a to-do list from a notepad.
Several photos are pages of the same note, in order.
Turn them into a checklist: put every goal, task or action point in "items", one each, in the writer's order and
own words, fixing only obvious spelling slips. Put anything that isn't something to do (a heading under the main
one, a thought, a verse, a reminder of why) in "extra" as short plain lines. Leave out crossed-out text and doodles.
If a word is unreadable, write [?]. Give a short title (under 6 words) from the page's heading or its main subject.`

const SCHEMA = {
  type: 'OBJECT',
  properties: { title: { type: 'STRING' }, items: { type: 'ARRAY', items: { type: 'STRING' } }, extra: { type: 'STRING' } },
  required: ['title', 'items'],
}

async function read(images: string[]) {
  let last = ''
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY! },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [...images.map((data) => ({ inline_data: { mime_type: 'image/jpeg', data } })), { text: PROMPT }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
      }),
    })
    if (res.status === 404 || res.status === 429 || res.status >= 500) {
      last = `${model}: ${res.status}`
      continue
    }
    if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    const out = JSON.parse(text) as { title?: string; items?: unknown[]; extra?: string }
    const items = (Array.isArray(out.items) ? out.items : []).map((i) => String(i).trim()).filter(Boolean).map((i) => `- [ ] ${i}`)
    const extra = String(out.extra ?? '').trim()
    const body = [items.join('\n'), extra].filter(Boolean).join('\n\n')
    return { title: String(out.title ?? '').slice(0, 120), body: body.slice(0, 20000) }
  }
  throw new Error(last || 'no model')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const me = await memberFrom(req)
  if (!me) return json({ error: 'not-allowed' }, 401)
  if (!KEY) return json({ error: 'ai-off' }, 503)
  let images: string[] = []
  try {
    const body = await req.json()
    images = (Array.isArray(body.images) ? body.images : [body.image]).filter((i: unknown) => typeof i === 'string' && i)
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  // Up to 8 pages and about 12 MB of base64 in all; the app sends far less.
  if (!images.length || images.length > 8 || images.reduce((n, i) => n + i.length, 0) > 12_000_000) return json({ error: 'bad-request' }, 400)
  try {
    return json(await read(images))
  } catch (e) {
    console.error(e)
    return json({ error: 'ai-failed' }, 502)
  }
})
