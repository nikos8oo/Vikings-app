-- Modèles de séance façon BTWB (variant) + format AMReps (score en reps)
alter table public.workouts add column if not exists variant text;
alter table public.workouts drop constraint if exists workouts_format_check;
alter table public.workouts add constraint workouts_format_check
  check (format in ('max','sets','emom','amrap','amreps','for_time','rft','tabata','death_by','intervals','quality'));
