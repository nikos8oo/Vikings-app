-- Vikings Athletes — schéma initial
-- Accès uniquement côté serveur : RLS activé partout, lignes ouvertes seulement aux requêtes
-- portant le secret serveur (en-tête x-va-secret, vérifié par empreinte SHA-256).

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_secret (
  id int primary key default 1 check (id = 1),
  hash text not null
);

create or replace function public.va_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    encode(extensions.digest(convert_to(coalesce(current_setting('request.headers', true)::json->>'x-va-secret', ''), 'utf8'), 'sha256'), 'hex')
      = (select hash from private.app_secret where id = 1),
    false)
$$;

-- Box (affiliées Vikings ou non)
create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  is_affiliate boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, city)
);

-- Athlètes (et équipe Vikings via role)
create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  sex text not null check (sex in ('M','F')),
  birth_year int check (birth_year between 1930 and 2020),
  bodyweight_kg numeric(5,1),
  height_cm int,
  box_id uuid references public.boxes(id) on delete set null,
  role text not null default 'athlete' check (role in ('athlete','coach','admin')),
  avatar_color text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index on public.athletes (box_id);

-- Référentiel des mouvements
-- metric : ce qu'on mesure pour ce mouvement (charge max, reps max, temps, distance, calories)
-- anchors_m / anchors_f : barème {"100":x,"85":x,"70":x,"60":x,"40":x} (100 = Games, 85 = Elite, 70 = RX, 60 = Intermédiaire)
create table public.movements (
  id text primary key,                 -- slug
  name text not null,
  name_en text,
  category text not null,              -- halterophilie, force, gymnastique, engine, haltere_kb, renfo, core, strongman
  family text,                         -- sous-famille (squat, hinge, press, pull, olympique…)
  equipment text,
  metric text not null check (metric in ('load','reps','time','distance','calories','height')),
  test_label text,                     -- ex. "1RM", "Max reps unbroken", "2000 m"
  better text not null default 'higher' check (better in ('higher','lower')),
  anchors_m jsonb,
  anchors_f jsonb,
  weight_in_level numeric(3,2) not null default 1,
  notes text,
  sort int not null default 0,
  active boolean not null default true
);
create index on public.movements (category);

-- Séances (prog Vikings, compétitions, affiliates, WOD de qualif, benchmarks)
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  workout_date date not null default (now() at time zone 'Europe/Paris')::date,
  source text not null default 'vikings' check (source in ('vikings','competition','affiliates','qualif','benchmark')),
  description text not null default '',
  coach_notes text,
  score_type text not null check (score_type in ('time','rounds_reps','reps','load','calories','distance','none')),
  better text not null default 'higher' check (better in ('higher','lower')),
  reps_per_round int,                  -- pour convertir rounds+reps en total
  time_cap_s int,
  movement_id text references public.movements(id) on delete set null, -- si la séance teste une charge (ex. 1RM snatch)
  movements text[] not null default '{}',
  anchors_m jsonb,                     -- barème pour les benchmarks / qualifs comptant dans le niveau
  anchors_f jsonb,
  counts_in_level boolean not null default false,
  published boolean not null default true,
  created_by uuid references public.athletes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.workouts (workout_date desc);
create index on public.workouts (source);

-- Résultats : un score sur une séance OU une perf sur un mouvement
-- value normalisée : kg, reps, secondes, mètres, calories
create table public.results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete cascade,
  movement_id text references public.movements(id) on delete cascade,
  value numeric(10,2) not null check (value >= 0),
  division text not null default 'rx' check (division in ('rx','scaled','foundation')),
  capped boolean not null default false,
  performed_on date not null default (now() at time zone 'Europe/Paris')::date,
  rpe int check (rpe between 1 and 10),
  notes text,
  bodyweight_kg numeric(5,1),
  created_at timestamptz not null default now(),
  check ((workout_id is not null) or (movement_id is not null))
);
create index on public.results (athlete_id, performed_on desc);
create index on public.results (movement_id);
create index on public.results (workout_id);

-- RLS : tout fermé sauf secret serveur
alter table public.boxes enable row level security;
alter table public.athletes enable row level security;
alter table public.movements enable row level security;
alter table public.workouts enable row level security;
alter table public.results enable row level security;

create policy srv on public.boxes for all using (public.va_ok()) with check (public.va_ok());
create policy srv on public.athletes for all using (public.va_ok()) with check (public.va_ok());
create policy srv on public.movements for all using (public.va_ok()) with check (public.va_ok());
create policy srv on public.workouts for all using (public.va_ok()) with check (public.va_ok());
create policy srv on public.results for all using (public.va_ok()) with check (public.va_ok());
