# Aurelio

Mobile-first PWA for Leo and Soniya: routines with streaks, tasks, a calendar, a shared "Together" layer,
notifications and Ori, the assistant. Built from `design_handoff_aurelio_pwa/` (the prototype HTML wins on any visual conflict).

Stack: Vite + React + TypeScript, React Router, Zustand (persisted to localStorage), vite-plugin-pwa (Workbox), self-hosted fonts.

```sh
npm install
npm run dev       # local dev server
npm run build     # type-check + production build with service worker
npm run preview   # serve the build (install/offline testing)
npm test          # vitest: streak rules, Ori parser, smoke test
npm run lint      # oxlint
npm run icons     # regenerate PWA icons from the app mark
```

## Layout

- `src/screens/` one file per route (21 screens). `src/sheets/` the item and routine sheets.
- `src/components/` shared pieces: Avatar, Ori, Ember, Icon, Toggle, Chip, Check, ProgressRing, BottomBar, Toast, Sheet, Heatmap.
- `src/data/` types, seed data, the persisted store and selectors. Everything is local in v1.
- `src/lib/streak.ts` the streak rules (full +1, ≥60% holds, <60% resets, skips neutral, paused frozen, day ends at 4am).
- `src/lib/ori.ts` turns a request into events, tasks, deadlines and routine edits.
- `src/lib/reminders.ts` routine-start, deadline and catch-up notifications.
- `src/styles/tokens.css` colours, gradients, radii, spacing, keyframes.

## Things to know

- **One device, two profiles.** v1 keeps both people on the same device behind the profile picker, as the handoff allows.
  Syncing two phones needs a small backend (Supabase or Firebase).
- **Ori runs offline by default** with a rule-based parser. To use an LLM instead, set `VITE_ORI_ENDPOINT` to a server-side
  endpoint that takes `{ transcript, now, today, routines }` and returns `{ items: [...] }` as described in the handoff.
  Never put an API key in the app.
- **Voice** uses the Web Speech API where the browser has it, and falls back to typing everywhere else.
- **Reminders** are shown by the service worker while the app is open or recently backgrounded. Reminders while the app is
  fully closed need Web Push from a server. On iPhone they only work once Aurelio is on the Home Screen.
- **Demo data** is generated relative to today on first launch. Settings → Reset demo data puts it back.

Install and offline only work over HTTPS (or localhost), so test on a phone through a deployed preview.
