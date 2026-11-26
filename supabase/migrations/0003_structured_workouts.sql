-- Vikings Athletes — séances structurées (format + mouvements prescrits) et volume réel

alter table public.workouts
  add column if not exists format text check (format in ('max','sets','emom','amrap','for_time','rft','tabata','death_by','intervals','quality')),
  add column if not exists items jsonb not null default '[]'::jsonb,   -- mouvements prescrits (reps, charges, %, séries)
  add column if not exists rounds int,
  add column if not exists duration_s int,
  add column if not exists interval_s int,
  add column if not exists rep_scheme int[],
  add column if not exists emom_mode text check (emom_mode in ('all','alternate')),
  add column if not exists block text;                                  -- partie de la séance du jour (A, B, C…)

alter table public.results
  add column if not exists as_written boolean not null default true,    -- « exactement comme écrit »
  add column if not exists detail jsonb,                                -- séries / modifications réellement faites
  add column if not exists volume jsonb;                                -- volume calculé par mouvement

-- Vue d'analyse : une ligne par (résultat, mouvement) avec reps, charges, tonnage, distance, calories
create or replace view public.result_volume with (security_invoker = true) as
select
  r.id as result_id,
  r.athlete_id,
  r.performed_on,
  r.workout_id,
  r.division,
  r.as_written,
  v->>'mv' as movement_id,
  coalesce((v->>'reps')::numeric, 0) as reps,
  coalesce((v->>'cal')::numeric, 0) as calories,
  coalesce((v->>'m')::numeric, 0) as distance_m,
  coalesce((v->>'s')::numeric, 0) as duration_s,
  (v->>'kg')::numeric as top_kg,
  coalesce((v->>'tonnage')::numeric, 0) as tonnage_kg
from public.results r
cross join lateral jsonb_array_elements(coalesce(r.volume, '[]'::jsonb)) v;

create index if not exists workouts_date_block_idx on public.workouts (workout_date desc, source, block);

-- Mouvements cardio génériques pour programmer (sans barème : ils ne comptent pas dans le niveau)
insert into public.movements (id, name, name_en, category, family, equipment, metric, test_label, better, sort) values
  ('row', 'Rameur', 'Row', 'engine', 'monostructural', 'Rameur', 'distance', 'Programmation', 'higher', 1000),
  ('run', 'Course', 'Run', 'engine', 'monostructural', null, 'distance', 'Programmation', 'higher', 1001),
  ('bike-erg', 'BikeErg', 'BikeErg', 'engine', 'monostructural', 'BikeErg', 'calories', 'Programmation', 'higher', 1002),
  ('echo-bike', 'Echo / Assault bike', 'Echo bike', 'engine', 'monostructural', 'Air bike', 'calories', 'Programmation', 'higher', 1003),
  ('ski-erg', 'SkiErg', 'SkiErg', 'engine', 'monostructural', 'SkiErg', 'calories', 'Programmation', 'higher', 1004),
  ('swim', 'Natation', 'Swim', 'engine', 'monostructural', null, 'distance', 'Programmation', 'higher', 1005),
  ('shuttle-run', 'Shuttle run', 'Shuttle run', 'engine', 'monostructural', null, 'distance', 'Programmation', 'higher', 1006),
  ('single-under', 'Single-under', 'Single-under', 'gymnastique', 'monostructural', 'Corde', 'reps', 'Programmation', 'higher', 1007)
on conflict (id) do nothing;
