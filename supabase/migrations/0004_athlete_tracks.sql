-- Programmes suivis par l'athlète (pistes affichées sur son calendrier)
alter table public.athletes
  add column if not exists tracks text[] not null default '{vikings,affiliates,competition,qualif}';
