-- Sous-familles : Gym suspendue / inversée ; Haltéro flexion / hinge / olympique (null = autre)
alter table public.movements add column if not exists pattern text;
alter table public.movements drop constraint if exists movements_pattern_check;
alter table public.movements add constraint movements_pattern_check check (pattern is null or pattern in ('suspendu','inverse','flexion','hinge','olympique'));

update public.movements set pattern = null;

update public.movements set pattern = 'suspendu' where modality = 'gym' and (family in ('muscle-up','pull','tirage') or id in
  ('toes-to-bar','knees-to-elbow','hanging-leg-raise','strict-knees-to-chest','dead-hang'));
update public.movements set pattern = 'inverse' where modality = 'gym' and (family = 'handstand' or id in
  ('strict-hspu','kipping-hspu','deficit-hspu','wall-facing-hspu','negative-hspu','pike-push-up'));

update public.movements set pattern = 'flexion' where modality = 'halt' and (family = 'squat' or id in ('bulgarian-split-squat'));
update public.movements set pattern = 'hinge' where modality = 'halt' and (family = 'hinge' or id in ('single-leg-rdl','kickstand-rdl','jefferson-curl','reverse-hyper'));
update public.movements set pattern = 'olympique' where modality = 'halt' and family in ('clean','snatch','jerk','olympique','technique');
