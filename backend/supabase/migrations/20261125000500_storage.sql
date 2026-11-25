-- =============================================================================
-- File storage buckets.
--   public-media      : website images & downloads (anyone can view; media.* to manage)
--   private-documents : sensitive uploads such as worker certificates (Phase 2).
--                       Users manage files in their own folder "<user id>/…";
--                       staff with workforce.view can read them.
-- Spec: doc/BACKEND_SPECIFICATION.md §5 (secure document uploads)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 10485760,  -- 10 MiB
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']),
  ('private-documents', 'private-documents', false, 20971520,  -- 20 MiB
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- public-media ---------------------------------------------------------------
create policy "public-media: anyone can read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');

create policy "public-media: staff upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.has_permission('media.create'));

create policy "public-media: staff update"
  on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and public.has_permission('media.edit'))
  with check (bucket_id = 'public-media' and public.has_permission('media.edit'));

create policy "public-media: staff delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.has_permission('media.delete'));

-- private-documents ----------------------------------------------------------
create policy "private-documents: owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "private-documents: owner upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'private-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "private-documents: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'private-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "private-documents: staff read"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-documents' and public.has_permission('workforce.view'));
