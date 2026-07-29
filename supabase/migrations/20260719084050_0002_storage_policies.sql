/*
# Storage policies for media bucket

## Overview
Allow any authenticated user to upload, read, and delete their own
objects under a per-user prefix `u/<user_id>/...`. Public read for
avatars/stories/posts so the browser can render them.

## Policies
- select: public (anyone can view media)
- insert: authenticated, object path must start with `u/<auth.uid>/`
- update: authenticated, owner path
- delete: authenticated, owner path
*/

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

drop policy if exists "media_insert_owner" on storage.objects;
create policy "media_insert_owner" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'u' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "media_update_owner" on storage.objects;
create policy "media_update_owner" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'u' and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'u' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "media_delete_owner" on storage.objects;
create policy "media_delete_owner" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'u' and (storage.foldername(name))[2] = auth.uid()::text);
