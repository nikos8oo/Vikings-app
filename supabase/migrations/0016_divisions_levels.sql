-- Catégories de score : Élite / RX / Inter / Fitness (remplace RX / Scaled / Foundation)
alter table public.results drop constraint if exists results_division_check;
update public.results set division = 'inter' where division = 'scaled';
update public.results set division = 'fitness' where division = 'foundation';
alter table public.results add constraint results_division_check check (division in ('elite','rx','inter','fitness'));
