-- Vikings Athletes — connexion par lien magique + nouveaux paliers (60 / 75 / 90 / 98-100)

-- 1. Plus de mot de passe : connexion par lien magique (email) ou code à 6 chiffres
alter table public.athletes alter column password_hash drop not null;

create table if not exists public.login_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,     -- SHA-256 du jeton du lien
  code_hash text not null,             -- SHA-256 de (email:code)
  signup jsonb,                        -- données d'inscription si le compte n'existe pas encore
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists login_tokens_email_idx on public.login_tokens (email, created_at desc);

alter table public.login_tokens enable row level security;
drop policy if exists srv on public.login_tokens;
create policy srv on public.login_tokens for all using (public.va_ok()) with check (public.va_ok());

-- 2. Barèmes : les références restent les mêmes, elles sont recalées sur les nouveaux paliers
--    réf. Élite 85 → 90, réf. RX 70 → 75 (Games 100, Inter 60, Fitness 40 inchangés)
create or replace function private.remap_anchors(a jsonb) returns jsonb
language sql immutable as $$
  select case when a is null or not (a ? '85') then a
  else (a - '85' - '70') || jsonb_build_object('90', a->'85', '75', a->'70') end
$$;

update public.movements set anchors_m = private.remap_anchors(anchors_m), anchors_f = private.remap_anchors(anchors_f)
  where anchors_m ? '85' or anchors_f ? '85';
update public.workouts set anchors_m = private.remap_anchors(anchors_m), anchors_f = private.remap_anchors(anchors_f)
  where anchors_m ? '85' or anchors_f ? '85';
