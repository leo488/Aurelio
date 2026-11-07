// Reads photos of handwritten notes (Leo's notepad), or a voice note, into a checklist with Google's
// Gemini (free tier). Nothing sent here is stored.
//   { images: base64 JPEG[] } (or one { image }) or { audio: base64 WAV }
//     → { title, body }, body's items as "- [ ] " lines
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

const VOICE_PROMPT = `This is a voice note: Leo talking through his goals, plans or thoughts.
Turn it into a note: put every goal, task or action point in "items", one each, short and in his own words, in the
order he said them. Put anything that isn't something to do (a thought, a verse, a reason) in "extra" as short plain
lines, tidied up but not rewritten. Leave out filler words and false starts.
Give a short title (under 6 words) from the main subject.`

const SCHEMA = {
  type: 'OBJECT',
  properties: { title: { type: 'STRING' }, items: { type: 'ARRAY', items: { type: 'STRING' } }, extra: { type: 'STRING' } },
  required: ['title', 'items'],
}

type Media = { mime: string; data: string }

async function read(media: Media[], prompt: string) {
  let last = ''
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY! },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [...media.map((m) => ({ inline_data: { mime_type: m.mime, data: m.data } })), { text: prompt }] }],
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
  let media: Media[] = []
  let voice = false
  try {
    const body = await req.json()
    if (typeof body.audio === 'string' && body.audio) {
      voice = true
      media = [{ mime: 'audio/wav', data: body.audio }]
    } else {
      const images = (Array.isArray(body.images) ? body.images : [body.image]).filter((i: unknown) => typeof i === 'string' && i)
      media = images.map((data: string) => ({ mime: 'image/jpeg', data }))
    }
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  // Up to 8 pages, or about 3 minutes of audio: 12 MB of base64 in all. The app sends less.
  if (!media.length || media.length > 8 || media.reduce((n, m) => n + m.data.length, 0) > 12_000_000) return json({ error: 'bad-request' }, 400)
  try {
    return json(await read(media, voice ? VOICE_PROMPT : PROMPT))
  } catch (e) {
    console.error(e)
    return json({ error: 'ai-failed' }, 502)
  }
})
