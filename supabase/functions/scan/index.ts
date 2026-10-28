// Reads a photo of handwritten notes (Leo's notepad) into tidy text with Google's Gemini (free tier).
//   { image: base64 JPEG }  → { title, body }
// Without GEMINI_API_KEY it answers 503 and the app lets him type the notes under the photo.
import { cors, json, memberFrom } from '../_shared/common.ts'

const KEY = Deno.env.get('GEMINI_API_KEY')
// Tried in order: a model that's gone or busy falls through to the next.
const MODELS = [Deno.env.get('GEMINI_MODEL'), 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'].filter(Boolean) as string[]

const PROMPT = `This is a photo of handwritten or printed notes, usually goals or a to-do list from a notepad.
Transcribe it faithfully into clean text. Keep the writer's own words and order; fix only obvious spelling slips.
Write lists as lines starting with "- ". Keep headings as their own lines. Leave out crossed-out text and doodles.
If a word is unreadable, write [?]. Give a short title (under 6 words) taken from the page's heading or its main subject.`

const SCHEMA = {
  type: 'OBJECT',
  properties: { title: { type: 'STRING' }, body: { type: 'STRING' } },
  required: ['title', 'body'],
}

async function read(image: string) {
  let last = ''
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY! },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'image/jpeg', data: image } }, { text: PROMPT }] }],
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
    const out = JSON.parse(text) as { title?: string; body?: string }
    return { title: String(out.title ?? '').slice(0, 120), body: String(out.body ?? '').slice(0, 20000) }
  }
  throw new Error(last || 'no model')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const me = await memberFrom(req)
  if (!me) return json({ error: 'not-allowed' }, 401)
  if (!KEY) return json({ error: 'ai-off' }, 503)
  let image = ''
  try {
    image = String((await req.json()).image ?? '')
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  // About 6 MB of base64 at most; the app sends far less.
  if (!image || image.length > 8_000_000) return json({ error: 'bad-request' }, 400)
  try {
    return json(await read(image))
  } catch (e) {
    console.error(e)
    return json({ error: 'ai-failed' }, 502)
  }
})
