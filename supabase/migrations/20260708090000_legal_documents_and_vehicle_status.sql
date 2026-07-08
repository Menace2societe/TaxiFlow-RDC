-- Align vehicle statuses with the application labels required by the current DB.
update public.vehicles
set status = case status
  when 'active' then 'en service'
  when 'inactive' then 'repos'
  else status
end;

alter table public.vehicles
  drop constraint if exists vehicles_status_check;

alter table public.vehicles
  alter column status set default 'repos';

alter table public.vehicles
  add constraint vehicles_status_check
  check (status in ('repos', 'en service', 'maintenance'));

insert into storage.buckets (id, name, public)
values ('legal-documents', 'legal-documents', true)
on conflict (id) do update set public = true;

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  document_name text not null,
  file_url text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists legal_documents_owner_idx on public.legal_documents (owner_id, created_at desc);
create index if not exists legal_documents_driver_idx on public.legal_documents (driver_id, created_at desc);

alter table public.legal_documents enable row level security;

drop policy if exists "Investors manage their legal documents" on public.legal_documents;
create policy "Investors manage their legal documents"
on public.legal_documents
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Drivers read their legal documents" on public.legal_documents;
create policy "Drivers read their legal documents"
on public.legal_documents
for select
using (driver_id = auth.uid());

drop policy if exists "Legal document object read" on storage.objects;
create policy "Legal document object read"
on storage.objects
for select
using (bucket_id = 'legal-documents');

drop policy if exists "Investors upload legal document objects" on storage.objects;
create policy "Investors upload legal document objects"
on storage.objects
for insert
with check (
  bucket_id = 'legal-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
