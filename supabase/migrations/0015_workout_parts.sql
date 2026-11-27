-- Séances en plusieurs parties (ex. 6 RFT puis 3 RFT) : [{rounds, rest_s}]
alter table public.workouts add column if not exists parts jsonb;
