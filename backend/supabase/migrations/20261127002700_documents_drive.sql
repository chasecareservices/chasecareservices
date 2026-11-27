-- =============================================================================
-- Documents for clients and care workers, kept in the company Google Drive.
--
-- The owner connects the company Google account once (Site settings). The website
-- then keeps files in "Chase Care Documents / Clients / <name>" and
-- ".../Care workers / <name>". This table lists the files and who may see them:
--   * client documents: office staff with clients.view (upload/delete: clients.edit)
--   * care worker documents: office staff with workforce.view (upload/delete: workforce.edit)
--   * care workers may SEND a file for a client they look after (e.g. a detailed
--     report). They can see the list of what they sent, never open the Drive.
-- The Google sign-in is stored encrypted, readable only by the website server.
-- =============================================================================

-- ---------- The company Drive connection (server only) ----------
create table private.drive_connection (
  id                 boolean primary key default true check (id),
  account_email      text not null,
  refresh_token_enc  text not null,              -- encrypted by the website (AES-256-GCM)
  root_folder_id     text not null,
  clients_folder_id  text not null,
  workers_folder_id  text not null,
  connected_by       uuid references auth.users (id) on delete set null,
  connected_at       timestamptz not null default now()
);
comment on table private.drive_connection is 'The company Google Drive the website stores documents in. One row.';

create table private.drive_folders (
  owner_kind  text not null check (owner_kind in ('client', 'worker')),
  owner_id    uuid not null,
  folder_id   text not null,
  primary key (owner_kind, owner_id)
);
comment on table private.drive_folders is 'The Drive folder made for each client and care worker.';

create function public.drive_connection_get()
returns table (account_email text, refresh_token_enc text, root_folder_id text, clients_folder_id text, workers_folder_id text, connected_at timestamptz)
language sql stable security definer set search_path = ''
as $$ select account_email, refresh_token_enc, root_folder_id, clients_folder_id, workers_folder_id, connected_at from private.drive_connection $$;

create function public.drive_connection_save(account_email text, refresh_token_enc text, root_folder_id text, clients_folder_id text, workers_folder_id text, connected_by uuid)
returns void
language sql volatile security definer set search_path = ''
as $$
  insert into private.drive_connection (id, account_email, refresh_token_enc, root_folder_id, clients_folder_id, workers_folder_id, connected_by, connected_at)
  values (true, account_email, refresh_token_enc, root_folder_id, clients_folder_id, workers_folder_id, connected_by, now())
  on conflict (id) do update set account_email = excluded.account_email, refresh_token_enc = excluded.refresh_token_enc,
    root_folder_id = excluded.root_folder_id, clients_folder_id = excluded.clients_folder_id,
    workers_folder_id = excluded.workers_folder_id, connected_by = excluded.connected_by, connected_at = now();
$$;

create function public.drive_connection_clear()
returns void
language sql volatile security definer set search_path = ''
as $$ delete from private.drive_connection; delete from private.drive_folders; $$;

create function public.drive_folder_get(owner_kind text, owner_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$ select folder_id from private.drive_folders f where f.owner_kind = drive_folder_get.owner_kind and f.owner_id = drive_folder_get.owner_id $$;

create function public.drive_folder_save(owner_kind text, owner_id uuid, folder_id text)
returns void
language sql volatile security definer set search_path = ''
as $$ insert into private.drive_folders values (owner_kind, owner_id, folder_id) on conflict (owner_kind, owner_id) do update set folder_id = excluded.folder_id $$;

-- Only the website server (secret key) may use these.
revoke all on function public.drive_connection_get(), public.drive_connection_save(text, text, text, text, text, uuid), public.drive_connection_clear(),
  public.drive_folder_get(text, uuid), public.drive_folder_save(text, uuid, text) from public, anon, authenticated;
grant execute on function public.drive_connection_get(), public.drive_connection_save(text, text, text, text, text, uuid), public.drive_connection_clear(),
  public.drive_folder_get(text, uuid), public.drive_folder_save(text, uuid, text) to service_role;

-- Whether Drive is connected (no secrets), for staff screens.
create function public.drive_status()
returns table (connected boolean, account_email text, connected_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select true, d.account_email, d.connected_at from private.drive_connection d where public.has_staff_role()
  union all
  select false, null, null where public.has_staff_role() and not exists (select 1 from private.drive_connection)
$$;
revoke all on function public.drive_status() from public, anon;
grant execute on function public.drive_status() to authenticated;

-- ---------- The documents ----------
create table public.care_documents (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references public.care_clients (id) on delete cascade,
  worker_id      uuid references public.profiles (id) on delete cascade,
  report_id      uuid references public.care_reports (id) on delete set null,
  drive_file_id  text not null unique,
  name           text not null check (char_length(name) between 1 and 200),
  mime_type      text not null check (char_length(mime_type) <= 150),
  size_bytes     bigint not null check (size_bytes between 1 and 26214400),
  category       text not null check (category in ('assessment', 'care_plan', 'consent', 'medical', 'report', 'identity', 'certificate', 'contract', 'other')),
  uploaded_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now(),
  constraint care_documents_one_owner check (num_nonnulls(client_id, worker_id) = 1),
  constraint care_documents_report_is_client check (report_id is null or client_id is not null)
);
comment on table public.care_documents is 'Files kept in the company Google Drive for a client or a care worker.';
create index care_documents_client_idx on public.care_documents (client_id, created_at desc);
create index care_documents_worker_idx on public.care_documents (worker_id, created_at desc);
create index care_documents_report_idx on public.care_documents (report_id);

alter table public.care_documents enable row level security;

create policy "care_documents: office reads client files" on public.care_documents
  for select to authenticated using (client_id is not null and public.has_permission('clients.view'));
create policy "care_documents: office reads care worker files" on public.care_documents
  for select to authenticated using (worker_id is not null and public.has_permission('workforce.view'));
create policy "care_documents: senders see what they sent" on public.care_documents
  for select to authenticated using (uploaded_by = (select auth.uid()));

create policy "care_documents: office adds client files" on public.care_documents
  for insert to authenticated
  with check (client_id is not null and uploaded_by = (select auth.uid()) and public.has_permission('clients.edit'));
create policy "care_documents: office adds care worker files" on public.care_documents
  for insert to authenticated
  with check (worker_id is not null and uploaded_by = (select auth.uid()) and public.has_permission('workforce.edit'));
create policy "care_documents: care workers send files for their clients" on public.care_documents
  for insert to authenticated
  with check (client_id is not null and uploaded_by = (select auth.uid()) and category = 'report'
              and public.is_care_worker() and public.is_assigned_to(client_id)
              and (report_id is null or exists (select 1 from public.care_reports r where r.id = report_id and r.worker_id = (select auth.uid()) and r.client_id = care_documents.client_id)));

create policy "care_documents: office removes client files" on public.care_documents
  for delete to authenticated using (client_id is not null and public.has_permission('clients.edit'));
create policy "care_documents: office removes care worker files" on public.care_documents
  for delete to authenticated using (worker_id is not null and public.has_permission('workforce.edit'));
-- No update: a file is replaced by uploading a new one.

revoke all on public.care_documents from anon;
grant select, insert, delete on public.care_documents to authenticated;
revoke truncate, references, trigger on public.care_documents from authenticated;
grant all on public.care_documents to service_role;

select private.enable_audit('public.care_documents');
