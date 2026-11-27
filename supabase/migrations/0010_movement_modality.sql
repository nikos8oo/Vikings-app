-- Trois grandes familles façon CrossFit : Gym (poids de corps), Haltéro (barre, DB, KB, charge externe), Monostructural (cardio)
alter table public.movements add column if not exists modality text;

update public.movements set modality = case
  when category = 'engine' then 'mono'
  when category in ('gymnastique', 'core') then 'gym'
  else 'halt' end;

-- Corde à sauter = cardio
update public.movements set modality = 'mono' where id in ('double-under','triple-under','crossover','single-under');
-- Traîneau = charge externe
update public.movements set modality = 'halt' where id in ('sled-push');
-- Core avec charge / câble
update public.movements set modality = 'halt' where id in ('pallof-press');
-- Renforcement au poids de corps
update public.movements set modality = 'gym' where id in (
  'walking-lunge','reverse-lunge','step-up','cossack-squat','nordic-curl','ghd-hip-extension','ghd-back-extension',
  'glute-bridge','calf-raise','dips-banc','dead-hang','strict-knees-to-chest','ring-fly','tempo-pull-up',
  'negative-pull-up','negative-hspu','arch-hold','band-pull-apart');

alter table public.movements alter column modality set default 'halt';
alter table public.movements alter column modality set not null;
alter table public.movements add constraint movements_modality_check check (modality in ('gym','halt','mono'));
create index if not exists movements_modality_idx on public.movements (modality);
