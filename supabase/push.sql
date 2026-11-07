-- Push notifications, sign-in protection and app settings. Runs after schema.sql. Safe to re-run.

-- ─── Push ────────────────────────────────────────────────────────────────────

-- One row per phone or browser that allowed notifications.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- Reminders waiting to be pushed. The app writes the next week of its own reminders here whenever
-- its data changes; a nudge from the other person is added by the trigger below. The push-dispatch
-- function sends whatever is due, every minute, and stamps sent_at.
create table if not exists public.scheduled_pushes (
  user_id    uuid not null references auth.users on delete cascade,
  key        text not null,
  fire_at    timestamptz not null,
  title      text not null,
  body       text,
  url        text,
  sent_at    timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index if not exists scheduled_pushes_due on public.scheduled_pushes (fire_at) where sent_at is null;

alter table public.push_subscriptions enable row level security;
alter table public.scheduled_pushes   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['push_subscriptions', 'scheduled_pushes'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated
      using (user_id = auth.uid() and public.is_member())
      with check (user_id = auth.uid() and public.is_member())', t);
  end loop;
end $$;

-- A nudge or cheer from the other person is pushed when its time comes, even if the app is closed.
create or replace function public.queue_partner_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('partner', 'nudge') and new.status = 'scheduled' then
    insert into public.scheduled_pushes (user_id, key, fire_at, title, body, url)
    values (new.user_id, new.id || '|partner', new.scheduled_for, new.title, new.body, 'notifications')
    on conflict (user_id, key) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.queue_partner_push();

-- ─── App settings readable by both members (e.g. the public push key) ────────

create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
drop policy if exists config_read on public.app_config;
create policy config_read on public.app_config for select to authenticated using (public.is_member());

-- ─── Wrong-PIN lockout, written only by the auth function ────────────────────

create table if not exists public.pin_attempts (
  role         text primary key,
  failures     integer not null default 0,
  locked_until timestamptz
);
alter table public.pin_attempts enable row level security;

-- ─── Server-only settings (the cron secret), never readable from the app ─────

create table if not exists public.server_config (
  key   text primary key,
  value text not null
);
alter table public.server_config enable row level security;
