-- Programmes auxquels l'athlète est affecté par l'équipe Vikings (il ne voit que ceux-là)
alter table public.athletes add column if not exists programs text[] not null default '{affiliates}';
update public.athletes set programs = array_remove(array[
    case when tracks && '{competition}' then 'competition' end,
    case when exists (select 1 from unnest(tracks) t where t like 'aff:%') then 'affiliates' end
  ], null)
  where role = 'athlete';
update public.athletes set programs = '{competition,affiliates}' where role in ('admin','coach');
update public.athletes set programs = '{affiliates}' where programs = '{}';
