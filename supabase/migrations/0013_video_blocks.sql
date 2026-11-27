alter table public.workouts add column if not exists video_url text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/webm','video/mp4','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "va videos insert" on storage.objects;
create policy "va videos insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'videos' and public.va_ok());
drop policy if exists "va videos select" on storage.objects;
create policy "va videos select" on storage.objects for select to anon, authenticated using (bucket_id = 'videos' and public.va_ok());
drop policy if exists "va videos delete" on storage.objects;
create policy "va videos delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'videos' and public.va_ok());
