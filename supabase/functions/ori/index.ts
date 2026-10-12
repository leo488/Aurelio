// Ori's brain: turns what a member said into routines (Leo) or tasks (Soniya) with Claude.
// The app validates whatever comes back and shows it for review before anything is saved.
//   { mode: 'routine', prompt }                         → { routine }
//   { transcript, now, today, routines }                → { items }
import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0'
import { cors, json, memberFrom } from '../_shared/common.ts'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
const MODEL = 'claude-opus-5-5'

const str = { type: ['string', 'null'] }
const ROUTINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'description', 'timeCategory', 'categoryLabel', 'scheduledTime', 'duration', 'days', 'steps'],
  properties: {
    name: { type: 'string', description: 'Short title, e.g. "Morning Routine"' },
    description: str,
    timeCategory: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'night', 'custom'] },
    categoryLabel: { ...str, description: 'Only for custom, e.g. "Before lunch"' },
    scheduledTime: { ...str, description: '24-hour HH:MM start time' },
    duration: { type: ['integer', 'null'], description: 'Total minutes' },
    days: { type: ['array', 'null'], items: { type: 'integer' }, description: '0 = Monday … 6 = Sunday; null for every day' },
    steps: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['title', 'duration'], properties: { title: { type: 'string' }, duration: { type: ['integer', 'null'] } } },
    },
  },
}

const ITEMS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'title', 'start', 'end', 'due', 'remindAt', 'assumption', 'routineId', 'time'],
        properties: {
          type: { type: 'string', enum: ['event', 'task', 'deadline', 'routineEdit'] },
          title: { type: 'string' },
          start: { ...str, description: 'Events: local "YYYY-MM-DDTHH:MM"' },
          end: { ...str, description: 'Events: local "YYYY-MM-DDTHH:MM"' },
          due: { ...str, description: 'Tasks and deadlines: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"' },
          remindAt: { ...str, description: 'When to remind, local "YYYY-MM-DDTHH:MM"' },
          assumption: { ...str, description: 'One short sentence if you had to guess something' },
          routineId: { ...str, description: 'routineEdit only: id from the list given' },
          time: { ...str, description: 'routineEdit only: new HH:MM start' },
        },
      },
    },
  },
}

const ROUTINE_SYSTEM = `You build daily routines for Leo in a habit app called Aurelio.
Turn what he says into one routine: a short name, the time of day, a start time if he gave or implied one, and 2–10 concrete steps in order with realistic minutes each.
Use his own words for steps where you can. If he gave a total length, make the steps add up to it. Keep titles short (under 6 words). Never invent medical or dietary advice.`

const ITEMS_SYSTEM = `You are Ori, the planner inside Aurelio. Turn what the person said into items for their calendar.
- event: something at a time (class, appointment, meeting). Give start and end; if no end, assume one hour.
- task: something to do, optionally on a day ("due") with a reminder time ("remindAt") when they asked to be reminded.
- deadline: something due by a date. Set remindAt to 09:00 two days before unless they said otherwise.
- routineEdit: only when they ask to move one of their existing routines; use its id.
Resolve relative dates ("tomorrow", "Friday") from today's date. Times without am/pm between 1 and 7 are afternoon. Split separate things into separate items. If something is unclear, make the sensible choice and say so in "assumption".`

const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined))

async function ask(system: string, user: string, schema: object) {
  // deno-lint-ignore no-explicit-any
  const params: any = {
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    // If the model declines, the API retries on a fallback model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  }
  const res = await client.beta.messages.create(params)
  if (res.stop_reason === 'refusal') throw new Error('refused')
  const text = res.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('empty')
  return JSON.parse(text.text) as Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const me = await memberFrom(req)
  if (!me) return json({ error: 'not-allowed' }, 401)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad-request' }, 400)
  }
  try {
    if (body.mode === 'routine') {
      const prompt = String(body.prompt ?? '').slice(0, 2000)
      if (!prompt.trim()) return json({ error: 'bad-request' }, 400)
      const r = await ask(ROUTINE_SYSTEM, prompt, ROUTINE_SCHEMA)
      const steps = Array.isArray(r.steps) ? r.steps.map((s) => clean(s as Record<string, unknown>)) : []
      return json({ routine: { ...clean(r), steps } })
    }
    const transcript = String(body.transcript ?? '').slice(0, 2000)
    if (!transcript.trim()) return json({ error: 'bad-request' }, 400)
    const routines = Array.isArray(body.routines) ? body.routines.slice(0, 50) : []
    const context = `Today is ${String(body.today ?? '')} (local time now ${String(body.now ?? '')}).` +
      (routines.length ? `\nTheir routines: ${JSON.stringify(routines)}` : '')
    const out = await ask(ITEMS_SYSTEM, `${context}\n\nThey said: “${transcript}”`, ITEMS_SCHEMA)
    const items = Array.isArray(out.items) ? out.items.map((i) => clean(i as Record<string, unknown>)) : []
    return json({ items })
  } catch (e) {
    console.error(e)
    return json({ error: 'ai-failed' }, 502)
  }
})
