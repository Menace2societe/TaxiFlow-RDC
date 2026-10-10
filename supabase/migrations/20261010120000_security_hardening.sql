-- =============================================================================
-- TaxiFlow-RDC — Durcissement sécurité + objets manquants
--
-- 1. Colonnes / tables utilisées par le code mais jamais créées
-- 2. Rôle et statut chauffeur-patron figés à l'inscription
-- 3. Lecture des profils limitée aux personnes liées (plus de fuite des numéros)
-- 4. Un chauffeur ne peut déclarer un versement qu'en attente
--    (seul le chauffeur-patron, propriétaire du véhicule, valide les siens)
-- 5. Seul un compte chauffeur peut être affecté à un véhicule
-- 6. Documents légaux privés (URL signées)
-- 7. Alerte kilométrique calculée en CDF
-- 8. Publication Realtime
--
-- Idempotent : peut être rejouée sans erreur sur une base existante.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Objets manquants
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_owner_driver boolean not null default false;

alter table public.legal_documents
  add column if not exists vehicle_id uuid references public.vehicles (id) on delete set null,
  add column if not exists document_type text not null default 'autre';

create index if not exists legal_documents_storage_path_idx
  on public.legal_documents (storage_path);

create table if not exists public.driver_contracts (
  id                   uuid          primary key default gen_random_uuid(),
  owner_id             uuid          not null references auth.users (id) on delete cascade,
  driver_id            uuid          not null references public.profiles (id) on delete cascade,
  vehicle_id           uuid          references public.vehicles (id) on delete set null,
  contract_type        text          not null check (contract_type in ('employe', 'location_vente')),
  status               text          not null default 'active' check (status in ('draft', 'active', 'terminated', 'completed')),
  possession_total_cdf numeric(14,2),
  possession_paid_cdf  numeric(14,2),
  started_at           date,
  ends_at              date,
  created_at           timestamptz   not null default now()
);

create index if not exists driver_contracts_driver_status_idx
  on public.driver_contracts (driver_id, status, created_at desc);

alter table public.driver_contracts enable row level security;

drop policy if exists driver_contracts_owner_all on public.driver_contracts;
create policy driver_contracts_owner_all
  on public.driver_contracts
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists driver_contracts_driver_select on public.driver_contracts;
create policy driver_contracts_driver_select
  on public.driver_contracts
  for select
  to authenticated
  using (driver_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Rôles figés à l'inscription
-- ----------------------------------------------------------------------------

-- Lecture du rôle sans passer par la RLS (évite la récursion dans les policies).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- L'inscription publique ne crée que des chauffeurs ou des investisseurs.
-- Un admin se nomme uniquement depuis le SQL editor Supabase (voir README).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  safe_role text := case when requested_role in ('driver', 'investor') then requested_role else 'driver' end;
begin
  insert into public.profiles (id, full_name, phone, role, is_owner_driver)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    safe_role,
    safe_role = 'driver' and coalesce((new.raw_user_meta_data->>'is_owner_driver')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Un utilisateur connecté ne peut pas changer son rôle ni son statut
-- chauffeur-patron. Le service role et le SQL editor (auth.uid() nul) le peuvent.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role not in ('driver', 'investor') then
      raise exception 'role_not_allowed' using hint = 'Seuls les rôles chauffeur et investisseur sont autorisés.';
    end if;
    if new.role <> 'driver' then
      new.is_owner_driver := false;
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_owner_driver is distinct from old.is_owner_driver then
    raise exception 'profile_privileges_locked' using hint = 'Le rôle est fixé à l''inscription.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileges();

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid() and role in ('driver', 'investor'));

-- ----------------------------------------------------------------------------
-- 3. Lecture des profils : soi-même, ses chauffeurs, son investisseur, l'admin
-- ----------------------------------------------------------------------------

drop policy if exists profiles_investor_read_drivers on public.profiles;
drop policy if exists profiles_related_read on public.profiles;
create policy profiles_related_read
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    -- investisseur → chauffeurs de ses véhicules
    or exists (
      select 1 from public.vehicles v
      where v.driver_id = profiles.id and v.owner_id = auth.uid()
    )
    -- investisseur → chauffeurs qui lui ont déjà versé (historique)
    or exists (
      select 1 from public.payments p
      where p.driver_id = profiles.id and p.investor_id = auth.uid()
    )
    -- chauffeur → propriétaire de son véhicule
    or exists (
      select 1 from public.vehicles v
      where v.owner_id = profiles.id and v.driver_id = auth.uid()
    )
  );

-- Recherche d'un chauffeur par téléphone exact, réservée aux investisseurs
-- et chauffeurs-patrons. Ne renvoie jamais la liste complète.
create or replace function public.find_driver_by_phone(p_phone text)
returns table (id uuid, full_name text, phone text, role text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and (me.role in ('investor', 'admin') or me.is_owner_driver)
  ) then
    raise exception 'not_authorized';
  end if;

  return query
    select pr.id, pr.full_name, pr.phone, pr.role
    from public.profiles pr
    where regexp_replace(coalesce(pr.phone, ''), '\s', '', 'g') = regexp_replace(p_phone, '\s', '', 'g')
    limit 1;
end;
$$;

revoke all on function public.find_driver_by_phone(text) from public;
grant execute on function public.find_driver_by_phone(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Versements chauffeur : toujours "pending" à la création
-- (le chauffeur-patron passe par payments_investor_all_own car investor_id = lui)
-- ----------------------------------------------------------------------------

drop policy if exists payments_driver_insert_assigned_vehicle on public.payments;
create policy payments_driver_insert_assigned_vehicle
  on public.payments
  for insert
  to authenticated
  with check (
    driver_id = auth.uid()
    and status = 'pending'
    and validated_at is null
    and reviewed_by is null
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and v.driver_id = auth.uid()
        and v.owner_id = investor_id
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Seul un profil chauffeur peut être affecté à un véhicule
-- ----------------------------------------------------------------------------

create or replace function public.ensure_vehicle_driver_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.driver_id is not null
     and (tg_op = 'INSERT' or new.driver_id is distinct from old.driver_id)
     and not exists (
       select 1 from public.profiles p
       where p.id = new.driver_id and p.role = 'driver'
     ) then
    raise exception 'driver_role_required' using hint = 'Ce compte n''est pas un chauffeur.';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_ensure_driver_role on public.vehicles;
create trigger vehicles_ensure_driver_role
  before insert or update of driver_id on public.vehicles
  for each row
  execute function public.ensure_vehicle_driver_role();

-- ----------------------------------------------------------------------------
-- 6. Documents légaux privés
-- Chemin des fichiers : <owner_id>/<driver_id>/<vehicle>/<fichier>
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

update storage.buckets set public = false where id = 'legal-documents';

drop policy if exists "Legal document object read" on storage.objects;
drop policy if exists "Investors upload legal document objects" on storage.objects;
drop policy if exists documents_owner_read on storage.objects;
drop policy if exists documents_driver_read on storage.objects;
drop policy if exists documents_owner_insert on storage.objects;
drop policy if exists documents_owner_delete on storage.objects;

create policy documents_owner_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('documents', 'legal-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy documents_driver_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('documents', 'legal-documents')
    and exists (
      select 1 from public.legal_documents d
      where d.storage_path = storage.objects.name
        and d.driver_id = auth.uid()
    )
  );

create policy documents_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('documents', 'legal-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy documents_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('documents', 'legal-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Les policies legal_documents existantes n'avaient pas de rôle cible.
drop policy if exists "Investors manage their legal documents" on public.legal_documents;
create policy "Investors manage their legal documents"
  on public.legal_documents
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Drivers read their legal documents" on public.legal_documents;
create policy "Drivers read their legal documents"
  on public.legal_documents
  for select
  to authenticated
  using (driver_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 7. Alerte kilométrique en CDF
-- L'ancienne règle comparait declared_amount (en USD ou CDF) à 5 000 :
-- un versement de 20 USD passait pour « suspect ». On compare revenue_cdf.
-- ----------------------------------------------------------------------------

-- Certaines bases déployées n'ont jamais reçu ces colonnes (la migration
-- canonique n'y a pas été appliquée) alors que le code les écrit.
alter table public.daily_entries
  add column if not exists amount          numeric(14,2) not null default 0,
  add column if not exists currency        text          not null default 'CDF',
  add column if not exists mileage_km      numeric(10,2) not null default 0,
  add column if not exists revenue_cdf     numeric(14,2) not null default 0,
  add column if not exists fuel_cdf        numeric(14,2) not null default 0,
  add column if not exists maintenance_cdf numeric(14,2) not null default 0,
  add column if not exists notes           text;

-- Montant en CDF des lignes existantes qui n'en ont pas (taux historique 2 800).
update public.daily_entries
set revenue_cdf = case
  when currency = 'USD' then round(coalesce(nullif(amount, 0), declared_amount, 0) * 2800)
  else coalesce(nullif(amount, 0), declared_amount, 0)
end
where revenue_cdf = 0
  and coalesce(nullif(amount, 0), declared_amount, 0) > 0;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_entries'
      and column_name = 'is_suspicious'
      and generation_expression like '%revenue_cdf%'
  ) then
    drop index if exists public.daily_entries_suspicious_idx;
    alter table public.daily_entries drop column if exists is_suspicious;
    alter table public.daily_entries
      add column is_suspicious boolean
        generated always as (
          (greatest(end_km - start_km, 0) > 50 and revenue_cdf <= 5000)
        ) stored;
    create index daily_entries_suspicious_idx
      on public.daily_entries (owner_id, entry_date desc)
      where is_suspicious;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Realtime (utilisé par SupabaseRealtimeRefresh)
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach t in array array['daily_entries', 'payments', 'vehicles', 'breakdowns'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
