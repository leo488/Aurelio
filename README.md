# Aurelio

A private PWA for two people. **Leo** gets routines, steps, streaks and stats. **Soniya** gets a daily planner with
tasks, reminders and a calendar. A light shared layer lets each see the other's progress numbers, send encouragement
and set reminders for each other. Built from `design_handoff_aurelio_pwa/`, reskinned with `design_handoff_aurelio_dark_skin/` (dark is the default look).

Stack: Vite + React + TypeScript, React Router, Zustand, vite-plugin-pwa (Workbox), self-hosted fonts, optional Supabase.

```sh
npm install
npm run dev       # local dev server (local mode, demo data)
npm run build     # type-check + production build with service worker
npm run preview   # serve the build (install/offline testing)
npm test          # vitest: streaks, stats, AI drafts, DB mapping, login and privacy flows
npm run lint      # oxlint
npm run icons     # regenerate PWA icons from the app mark
```

## How it fits together

```
screens ─▶ useData (src/data/store.ts) ─▶ services (src/services/index.ts) ─▶ Backend
                                                                              ├─ local: localStorage + demo seed
                                                                              └─ supabase: Postgres + RLS, offline outbox
```

- `src/config.ts` the two profiles. Their emails come from env, nothing else can sign in and there is no registration.
- `src/services/backend.ts` the storage and auth contracts. Adding another database means writing one `Backend`.
- `src/services/supabase/` the Supabase backend; `supabase/schema.sql` its tables and Row Level Security.
- `src/lib/streak.ts` streaks from completion records, against each routine's schedule (not calendar days):
  full day +1, ≥60% holds, <60% resets, skipped/unscheduled/inactive days are neutral, the day ends at 4am.
  Each completion stores the steps that were required that day, and schedule changes are kept as history,
  so editing a routine never rewrites past streaks.
- `src/lib/stats.ts` Leo's and Soniya's profile numbers, including Soniya's planning streak (days with ≥60% of the plan done).
- `src/lib/routineDraft.ts` AI routine creation: structured JSON, validated, reviewed in the New Routine form, saved only on Save.
- `src/lib/reminders.ts` reminders derived from routines and tasks, plus nudges between the two people.

## Sign-in

First time on a device: pick a profile, enter the code sent to that profile's email, create a 4 to 8 digit PIN.
After that: "Who are you?", then the PIN. The app locks again when it is closed. Nothing private renders before sign-in.

PINs are never stored as typed. The device keeps a salted PBKDF2 hash (210k iterations) with a lockout that backs off
after 5 misses. With Supabase, the account password is a PBKDF2 secret derived from the PIN and email, so a PIN also
works on a second device. A short PIN is still a short password: the email code is the real gate, and new sign-ups
must stay off in Supabase.

## Configuration

Copy `.env.example` to `.env.local`.

| Variable | What it does |
| --- | --- |
| `VITE_LEO_EMAIL`, `VITE_SONIA_EMAIL` | The only two accounts. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Turn on the database. Leave empty for local mode. |
| `VITE_ORI_ENDPOINT` | Optional server endpoint for Ori and AI routine drafts. Never put an API key in the app. |

**Local mode** (no Supabase vars) keeps everything in this browser with demo data, and the email code is `123456`.
Settings → Reset demo data puts the demo back.

### Supabase setup

1. Create a project. In Authentication → Providers → Email, turn off "Allow new users to sign up".
2. Edit the two emails at the top of `supabase/schema.sql`, then run it in the SQL editor.
3. Authentication → Users → Add user, once for each email (no password needed).
4. Authentication → Email Templates → Magic Link: include `{{ .Token }}` so the email carries the 6-digit code.
5. Set the env vars above where the app is built.

## Things to know

- **Theme:** every colour is a token in `src/styles/tokens.css`; components hold no raw colours. The dark skin is the
  default, and the original light skin sits behind the same tokens as `<html data-theme="light">`, ready for an
  Appearance setting.

- **Offline:** the app shell is cached by the service worker. With Supabase, writes made offline are queued and sent
  when the connection is back, and the PIN unlocks offline on a device that has signed in before.
- **Reminders** are shown by the service worker while the app is open or recently backgrounded. Reminders while the app
  is fully closed need Web Push from a server. On iPhone they only work once Aurelio is on the Home Screen.
- **Voice** uses the Web Speech API where the browser has it, and falls back to typing.

- **Screens** follow the dark prototype (`Aurelio Prototype v2 Dark`). Shared pieces such as rings, headers, step and
  task rows and the task and reminder sheets live in `src/components/ui.tsx`. The old Together and Settings screens
  were folded into each person's Today and You tabs; `/together` and `/settings` redirect to `/profile`.

## Deploy and install

Install and offline only work over HTTPS (or localhost). `.github/workflows/pages.yml` builds the app on every push to
`claude/design-v2-llqmbc` and publishes it to the `gh-pages` branch, served at `https://leo488.github.io/Aurelio/`.
In the repository's Settings → Pages, set the source to "Deploy from a branch", `gh-pages`, `/ (root)` once.
On Android, open that link in Chrome and tap Install app (or ⋮ → Add to Home screen).

The build reads `BASE_PATH` (default `/`) so the same code works at a domain root or under a sub-path.
