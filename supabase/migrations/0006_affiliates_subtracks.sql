-- Programmes : Vikings Compétition + Vikings Affiliates (pistes CrossFit, Hyrox, Gym, Haltérophilie, FBB, Engine)
alter table public.workouts add column if not exists subtrack text
  check (subtrack in ('crossfit','hyrox','gym','halterophilie','fbb','engine'));
update public.workouts set source = 'competition' where source = 'vikings';
update public.workouts set subtrack = 'crossfit' where source = 'affiliates' and subtrack is null;
-- pistes suivies : 'competition', 'aff:<piste>', 'qualif'
alter table public.athletes alter column tracks set default '{competition,aff:crossfit,qualif}';
update public.athletes set tracks = '{competition,aff:crossfit,aff:hyrox,aff:gym,aff:halterophilie,aff:fbb,aff:engine,qualif}'
  where tracks && '{vikings,affiliates}';
