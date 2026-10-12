-- Aurelio database: two people, their routines and tasks, and a small shared layer.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query). Safe to re-run.
--
-- The deploy workflow (.github/workflows/pages.yml) runs this, then push.sql, and fills `members`
-- from the LEO_EMAIL and SONIYA_EMAIL repository secrets so the addresses never live in the code.

-- ─── Who may use the app ─────────────────────────────────────────────────────

create table if not exists public.members (
  email text primary key,
  role  text not null unique check (role in ('leo', 'sonia'))
);

-- True when the signed-in user is one of the two members. Every policy below checks it.
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where lower(m.email) = lower(auth.jwt() ->> 'email'));
$$;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  name       text not null,
  role       text not null unique check (role in ('leo', 'sonia'))
);

create table if not exists public.routines (
  id               text primary key,
  user_id          uuid not null references auth.users on delete cascade,
  name             text not null,
  description      text,
  icon             text not null,
  time_category    text not null check (time_category in ('morning', 'afternoon', 'evening', 'night', 'custom')),
  category_label   text,
  scheduled_time   text check (scheduled_time ~ '^\d{2}:\d{2}$'),
  repeat_pattern   jsonb not null,
  schedule_history jsonb,
  steps            jsonb not null default '[]',
  reminder         jsonb not null,
  active           boolean not null default true,
  inactive_ranges  jsonb,
  created_at       date not null,
  updated_at       timestamptz not null default now()
);

-- One row per routine per day: which steps were done. Streaks are calculated from these.
create table if not exists public.routine_completions (
  id                 text primary key,
  routine_id         text not null references public.routines on delete cascade,
  user_id            uuid not null references auth.users on delete cascade,
  date               date not null,
  completed_step_ids jsonb not null default '[]',
  required_step_ids  jsonb,
  skipped_step_ids   jsonb,
  skipped            boolean,
  backfilled         boolean,
  started_at         timestamptz,
  completed_at       timestamptz,
  updated_at         timestamptz not null default now(),
  unique (routine_id, date)
);

create table if not exists public.tasks (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  title        text not null,
  notes        text,
  date         date,
  start_time   text check (start_time ~ '^\d{2}:\d{2}$'),
  end_time     text check (end_time ~ '^\d{2}:\d{2}$'),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  deadline     boolean,
  completed    boolean not null default false,
  completed_at timestamptz,
  reminder_at  text, -- local wall-clock time, "2026-10-12T08:45"
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Reminders that fired and nudges between the two. user_id is the person who receives it.
create table if not exists public.notifications (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  kind          text not null check (kind in ('routine', 'task', 'deadline', 'catchup', 'partner', 'nudge')),
  title         text not null,
  body          text,
  ref_type      text,
  ref_id        text,
  scheduled_for timestamptz not null,
  status        text not null check (status in ('scheduled', 'sent', 'read')),
  from_user_id  uuid references auth.users on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.activity (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null,
  text       text not null,
  value      integer,
  cheered_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id          uuid primary key references auth.users on delete cascade,
  user_id     uuid not null unique references auth.users on delete cascade,
  notif       jsonb not null,
  ori_confirm boolean not null default true,
  updated_at  timestamptz not null default now(),
  check (id = user_id)
);

-- Today's numbers only, so each person can see the other's progress without the details.
create table if not exists public.daily_status (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  done       integer not null,
  total      integer not null,
  unit       text not null check (unit in ('routines', 'tasks')),
  streak     integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Goals for an ISO week ("2026-W42"). Private to the owner.
create table if not exists public.weekly_goals (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  week       text not null check (week ~ '^\d{4}-W\d{2}$'),
  title      text not null,
  done       boolean not null default false,
  done_at    timestamptz,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routines_user on public.routines (user_id);
create index if not exists completions_user_date on public.routine_completions (user_id, date);
create index if not exists tasks_user_date on public.tasks (user_id, date);
create index if not exists notifications_user on public.notifications (user_id, scheduled_for desc);
create index if not exists activity_user on public.activity (user_id, created_at desc);
create index if not exists goals_user_week on public.weekly_goals (user_id, week);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.members             enable row level security;
alter table public.profiles            enable row level security;
alter table public.routines            enable row level security;
alter table public.routine_completions enable row level security;
alter table public.tasks               enable row level security;
alter table public.notifications       enable row level security;
alter table public.activity            enable row level security;
alter table public.settings            enable row level security;
alter table public.daily_status        enable row level security;
alter table public.weekly_goals        enable row level security;

-- Private tables: only the owner, and only if they are a member.
do $$
declare t text;
begin
  foreach t in array array['routines', 'routine_completions', 'tasks', 'settings', 'weekly_goals'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated
      using (user_id = auth.uid() and public.is_member())
      with check (user_id = auth.uid() and public.is_member())', t);
  end loop;
end $$;

-- Profiles: both can read both (names and roles only); each writes their own, matching the allowlist.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (public.is_member());
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and exists (
    select 1 from public.members m where lower(m.email) = lower(auth.jwt() ->> 'email') and m.role = profiles.role));

-- Shared, read-only for the other person: activity and today's numbers.
drop policy if exists activity_read on public.activity;
create policy activity_read on public.activity for select to authenticated using (public.is_member());
drop policy if exists activity_write on public.activity;
create policy activity_write on public.activity for all to authenticated
  using (user_id = auth.uid() and public.is_member()) with check (user_id = auth.uid() and public.is_member());

drop policy if exists status_read on public.daily_status;
create policy status_read on public.daily_status for select to authenticated using (public.is_member());
drop policy if exists status_write on public.daily_status;
create policy status_write on public.daily_status for all to authenticated
  using (user_id = auth.uid() and public.is_member()) with check (user_id = auth.uid() and public.is_member());

-- Notifications: you read and update your own; you may also send a nudge or encouragement to the other member.
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for all to authenticated
  using (user_id = auth.uid() and public.is_member()) with check (user_id = auth.uid() and public.is_member());
drop policy if exists notifications_send on public.notifications;
create policy notifications_send on public.notifications for insert to authenticated
  with check (public.is_member() and from_user_id = auth.uid() and kind in ('partner', 'nudge')
    and user_id in (select id from public.profiles));

-- The allowlist itself is never readable from the app.
