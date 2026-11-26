-- Données de démonstration (supprimables d'un clic, sans toucher aux vraies données)
alter table public.workouts add column if not exists is_demo boolean not null default false;
alter table public.athletes add column if not exists is_demo boolean not null default false;
alter table public.boxes add column if not exists is_demo boolean not null default false;
create index if not exists workouts_demo_idx on public.workouts (is_demo) where is_demo;
create index if not exists athletes_demo_idx on public.athletes (is_demo) where is_demo;
