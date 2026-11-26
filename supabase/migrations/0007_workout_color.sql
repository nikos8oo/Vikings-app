-- Couleur d'un bloc (repère visuel dans le planning et chez l'athlète)
alter table public.workouts add column if not exists color text
  check (color in ('bleu','lime','ciel','violet','rose','rouge','orange','ambre','vert','ardoise'));
