-- ══════════════════════════════════════════════════════════════════════════════
-- Chess Academy — Full Schema + Migration
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to run on an existing database (idempotent).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Base tables (create if they don't exist yet) ──────────────────────────────

create table if not exists profiles (
  id           bigserial    primary key,
  username     text         unique not null,
  password     text         not null,
  name         text         not null,
  role         text         not null default 'student'
                            check (role in ('admin','coach','student')),
  avatar       text,
  phone        text,
  email        text,
  lichess_id   text,
  chess_com_id text,
  dob          date,
  rating       int,
  settings     jsonb        not null default '{}',
  created_at   timestamptz  not null default now()
);

create table if not exists academies (
  id              bigserial   primary key,
  name            text        not null,
  phone           text,
  location        text,
  main_coach      text,
  main_coach_id   bigint      references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists coaches (
  id         bigserial   primary key,
  name       text        not null,
  avatar     text,
  rating     int,
  levels     text[]      default '{}',
  dob        date,
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists batches (
  id           text        primary key,
  name         text        not null,
  coach        text,
  level        text        default 'Beginner',
  days         text[]      default '{}',
  times        jsonb       default '{}',
  meeting_link text,
  is_active    boolean     default true,
  students     jsonb       default '[]',
  created_at   timestamptz not null default now()
);

create table if not exists pgns (
  id           text        primary key,
  name         text        not null,
  type         text        default 'racer',
  content      text,
  puzzle_count int         default 0,
  date         text,
  created_at   timestamptz not null default now()
);

create table if not exists puzzles (
  id         text        primary key,
  pgn_id     text        not null references pgns(id) on delete cascade,
  fen        text        not null,
  solution   text[]      not null,
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists homework (
  id           text        primary key,
  title        text        not null,
  batch_id     text,
  batch_name   text,
  pgn_id       text,
  pgn_name     text,
  due_date     text,
  notes        text,
  assigned_by  text,
  academy_id   bigint      references academies(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists race_scores (
  id           bigserial   primary key,
  user_id      bigint      references profiles(id) on delete set null,
  user_name    text        not null,
  score        int         not null,
  wrong_count  int         default 0,
  time_seconds int         not null,
  time_fmt     text,
  created_at   timestamptz not null default now()
);

-- ── Migrations: add columns that may be missing ───────────────────────────────

-- profiles: level + batch_code + academy_id
alter table profiles add column if not exists level      text;
alter table profiles add column if not exists batch_code text;
do $$ begin
  alter table profiles add column academy_id bigint references academies(id) on delete set null;
exception when duplicate_column then null; end $$;

-- academies: logo
alter table academies add column if not exists logo text;

-- batches: coach_id + academy_id
do $$ begin
  alter table batches add column coach_id bigint references profiles(id) on delete set null;
exception when duplicate_column then null; end $$;
do $$ begin
  alter table batches add column academy_id bigint references academies(id) on delete set null;
exception when duplicate_column then null; end $$;

-- homework: academy_id (if table was created without it)
do $$ begin
  alter table homework add column academy_id bigint references academies(id) on delete set null;
exception when duplicate_column then null; end $$;

-- ── batch_students: junction table ───────────────────────────────────────────

create table if not exists batch_students (
  batch_id    text    not null references batches(id)  on delete cascade,
  student_id  bigint  not null references profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (batch_id, student_id)
);

-- ── attendance: full table ────────────────────────────────────────────────────

create table if not exists attendance (
  id          bigserial   primary key,
  academy_id  bigint      references academies(id)  on delete set null,
  batch_id    text        references batches(id)    on delete cascade,
  batch_code  text,
  coach_id    bigint      references profiles(id)   on delete set null,
  student_id  bigint      not null references profiles(id) on delete cascade,
  date        date        not null,
  present     boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- Add missing columns if table already existed with old schema
alter table attendance add column if not exists academy_id bigint references academies(id) on delete set null;
alter table attendance add column if not exists coach_id   bigint references profiles(id)  on delete set null;
alter table attendance add column if not exists batch_code text;

-- Unique constraint required for upsert
do $$ begin
  alter table attendance
    add constraint attendance_batch_student_date unique (batch_id, student_id, date);
exception when duplicate_table or duplicate_object then null; end $$;

-- ── homework_progress: per-student puzzle results ────────────────────────────

create table if not exists homework_progress (
  id           bigserial   primary key,
  homework_id  text        not null references homework(id) on delete cascade,
  student_id   bigint      not null references profiles(id) on delete cascade,
  puzzle_id    text        not null,
  solved       boolean     not null default true,
  wrong_count  int         not null default 0,
  time_seconds int,
  updated_at   timestamptz not null default now(),
  unique (homework_id, student_id, puzzle_id)
);

-- ── academy_invitations: coach invite/accept flow ────────────────────────────

create table if not exists academy_invitations (
  id           bigserial   primary key,
  academy_id   bigint      not null references academies(id)  on delete cascade,
  coach_id     bigint      not null references profiles(id)   on delete cascade,
  status       text        not null default 'pending',   -- pending / accepted / rejected
  invited_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (academy_id, coach_id)
);

-- ── homework_submissions: student answers submitted for coach review ─────────

create table if not exists homework_submissions (
  id           bigserial   primary key,
  homework_id  text        not null references homework(id) on delete cascade,
  student_id   bigint      not null references profiles(id) on delete cascade,
  puzzle_id    text        not null,
  moves        text[]      not null default '{}',
  submitted_at timestamptz not null default now(),
  reviewed     boolean     not null default false,
  correct      boolean,
  unique (homework_id, student_id, puzzle_id)
);

-- ── Disable RLS (app uses custom auth, not Supabase Auth) ────────────────────
-- The anon key must be able to read/write all tables directly.

alter table profiles              disable row level security;
alter table academies             disable row level security;
alter table coaches               disable row level security;
alter table batches               disable row level security;
alter table batch_students        disable row level security;
alter table pgns                  disable row level security;
alter table puzzles               disable row level security;
alter table homework              disable row level security;
alter table homework_progress     disable row level security;
alter table homework_submissions  disable row level security;
alter table academy_invitations   disable row level security;
alter table attendance        disable row level security;
alter table race_scores       disable row level security;

-- ── Seed: default users ───────────────────────────────────────────────────────

insert into profiles (username, password, name, role, avatar) values
  ('admin',   'admin123',   'Admin User',  'admin',   'A'),
  ('coach',   'coach123',   'Coach Ravi',  'coach',   'R'),
  ('student', 'student123', 'Arjun Kumar', 'student', 'K')
on conflict (username) do nothing;

-- ── Class Sessions ────────────────────────────────────────────────────────────

create table if not exists class_sessions (
  id           uuid        primary key default gen_random_uuid(),
  batch_id     text        references batches(id) on delete cascade,
  batch_name   text,
  academy_id   bigint      references academies(id) on delete cascade,
  date         date        not null default current_date,
  title        text,
  notes        text,
  pgn_ids      text[]      not null default '{}',
  created_by   text,
  created_at   timestamptz not null default now()
);

create index if not exists class_sessions_batch_id_idx  on class_sessions(batch_id);
create index if not exists class_sessions_academy_id_idx on class_sessions(academy_id);
create index if not exists class_sessions_date_idx       on class_sessions(date desc);

alter table class_sessions add column if not exists pdf_attachments jsonb default '[]';
