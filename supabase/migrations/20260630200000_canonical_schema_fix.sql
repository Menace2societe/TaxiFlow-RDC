-- =============================================================================
-- TaxiFlow-RDC — Migration canonique idempotente
-- Fichier : 20260630200000_canonical_schema_fix.sql
--
-- But : Garantir que TOUTES les tables, colonnes, types, index, policies et
--       fonctions requis par les Server Actions Next.js existent avec le bon
--       type. Ce script est conçu pour être ré-exécuté à tout moment sans
--       jamais échouer (100% idempotent).
--
-- Ordre d'exécution :
--   1. Types ENUM
--   2. Tables (profiles → vehicles → daily_entries → breakdowns)
--   3. Colonnes manquantes (ALTER TABLE … ADD COLUMN IF NOT EXISTS)
--   4. Contraintes et clés étrangères
--   5. Index
--   6. Row Level Security (RLS) + policies
--   7. Fonctions / RPC
--   8. Notification PostgREST
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. TYPES ENUM (idempotent via DO block)
-- ----------------------------------------------------------------------------

do $$
begin
  -- breakdown_status
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'breakdown_status'
      and n.nspname = 'public'
  ) then
    create type public.breakdown_status as enum ('open', 'in_progress', 'resolved');
  end if;
end $$;

-- vehicle_status (utilisé dans les Server Actions comme type TypeScript)
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'vehicle_status'
      and n.nspname = 'public'
  ) then
    create type public.vehicle_status as enum ('active', 'inactive', 'maintenance');
  end if;
end $$;

-- user_role
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role'
      and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('driver', 'investor', 'admin');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. TABLE public.profiles
-- Référencée par : register.ts, investor-fleet.ts, data.ts
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       text        not null default 'driver',
  phone      text,
  created_at timestamptz not null default now()
);

-- Colonne phone (peut manquer sur les bases déployées avant cette migration)
alter table public.profiles
  add column if not exists phone text;

-- Colonne full_name (sécurité)
alter table public.profiles
  add column if not exists full_name text;

-- Colonne role avec valeur par défaut
alter table public.profiles
  add column if not exists role text not null default 'driver';

-- Check constraint sur role (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('driver', 'investor', 'admin'));
  end if;
end $$;

-- RLS sur profiles
alter table public.profiles enable row level security;

-- Policy : chaque utilisateur peut lire et modifier son propre profil
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_self_select'
  ) then
    create policy profiles_self_select
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_self_update'
  ) then
    create policy profiles_self_update
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end $$;

-- Policy : l'investisseur peut lire les profils chauffeurs (pour assignation)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_investor_read_drivers'
  ) then
    create policy profiles_investor_read_drivers
      on public.profiles
      for select
      to authenticated
      using (
        -- L'investisseur lit les chauffeurs ; le chauffeur voit les autres chauffeurs si nécessaire
        role = 'driver'
        or id = auth.uid()
      );
  end if;
end $$;

-- Policy : upsert autorisé sur son propre profil (nécessaire pour register.ts)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and policyname = 'profiles_self_insert'
  ) then
    create policy profiles_self_insert
      on public.profiles
      for insert
      to authenticated
      with check (id = auth.uid());
  end if;
end $$;

-- Index téléphone pour recherche dans registerOrAssignDriverByPhone
create index if not exists profiles_phone_idx
  on public.profiles (phone)
  where phone is not null;

create index if not exists profiles_role_idx
  on public.profiles (role);

-- ----------------------------------------------------------------------------
-- 3. TABLE public.vehicles
-- Référencée par : vehicles.ts, investor-fleet.ts, entries.ts, breakdowns.ts, data.ts
-- ----------------------------------------------------------------------------

create table if not exists public.vehicles (
  id                   uuid          primary key default gen_random_uuid(),
  owner_id             uuid          not null references auth.users (id) on delete cascade,
  driver_id            uuid          null,
  plate_number         text          not null,
  label                text          not null default 'Vehicule',
  type                 text          not null default 'taxi',
  status               text          not null default 'inactive',
  target_daily_revenue numeric(14,2) not null default 0,
  created_at           timestamptz   not null default now()
);

-- Colonnes qui peuvent manquer selon le déploiement initial
alter table public.vehicles
  add column if not exists driver_id            uuid          null,
  add column if not exists label                text,
  add column if not exists target_daily_revenue numeric(14,2) not null default 0,
  add column if not exists type                 text          not null default 'taxi',
  add column if not exists status               text          not null default 'inactive';

-- Migration des données legacy (vehicles.name → label, vehicles.model → label)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'vehicles'
      and column_name  = 'name'
  ) then
    execute 'update public.vehicles
             set label = coalesce(label, nullif(name, ''''))
             where label is null or label = ''''';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'vehicles'
      and column_name  = 'model'
  ) then
    execute 'update public.vehicles
             set label = coalesce(label, nullif(model, ''''))
             where label is null or label = ''''';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'vehicles'
      and column_name  = 'daily_objective'
  ) then
    execute '
      update public.vehicles
      set target_daily_revenue = coalesce(
        nullif(target_daily_revenue, 0),
        case
          when daily_objective::text ~ ''^[0-9]+(\.[0-9]+)?$'' then daily_objective::numeric
          else 0
        end,
        0
      )
      where target_daily_revenue = 0 or target_daily_revenue is null';
  end if;
end $$;

-- Backfill label avec valeur par défaut si toujours null
update public.vehicles
set label = coalesce(nullif(label, ''), 'Vehicule')
where label is null or label = '';

-- Rendre label NOT NULL maintenant que toutes les lignes ont une valeur
alter table public.vehicles
  alter column label set not null,
  alter column label set default 'Vehicule',
  alter column target_daily_revenue set default 0;

-- Check contrainte sur type
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicles_type_check'
      and conrelid = 'public.vehicles'::regclass
  ) then
    alter table public.vehicles
      add constraint vehicles_type_check
      check (type in ('taxi', 'moto'));
  end if;
end $$;

-- Check contrainte sur status
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicles_status_check'
      and conrelid = 'public.vehicles'::regclass
  ) then
    alter table public.vehicles
      add constraint vehicles_status_check
      check (status in ('active', 'inactive', 'maintenance'));
  end if;
end $$;

-- Clé étrangère driver_id → profiles.id
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicles_driver_id_fkey'
  ) then
    alter table public.vehicles
      add constraint vehicles_driver_id_fkey
      foreign key (driver_id)
      references public.profiles (id)
      on delete set null;
  end if;
end $$;

-- Unicité plaque normalisée par propriétaire
create unique index if not exists vehicles_owner_plate_normalized_uidx
  on public.vehicles (owner_id, upper(replace(plate_number, ' ', '')));

-- Indexes de performance
create index if not exists vehicles_owner_idx
  on public.vehicles (owner_id);

create index if not exists vehicles_owner_status_idx
  on public.vehicles (owner_id, status);

create index if not exists vehicles_driver_id_idx
  on public.vehicles (driver_id)
  where driver_id is not null;

create index if not exists vehicles_owner_driver_idx
  on public.vehicles (owner_id, driver_id);

create index if not exists vehicles_owner_label_idx
  on public.vehicles (owner_id, label);

-- RLS véhicules
alter table public.vehicles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'vehicles'
      and policyname = 'vehicles_owner_all'
  ) then
    create policy vehicles_owner_all
      on public.vehicles
      for all
      to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'vehicles'
      and policyname = 'vehicles_driver_select'
  ) then
    create policy vehicles_driver_select
      on public.vehicles
      for select
      to authenticated
      using (driver_id = auth.uid());
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. TABLE public.daily_entries  (versements journaliers des chauffeurs)
-- Référencée par : entries.ts, data.ts
-- ----------------------------------------------------------------------------

create table if not exists public.daily_entries (
  id               uuid          primary key default gen_random_uuid(),
  owner_id         uuid          not null references auth.users (id) on delete cascade,
  vehicle_id       uuid          not null references public.vehicles (id) on delete cascade,
  driver_id        uuid          null        references public.profiles (id) on delete set null,
  entry_date       date          not null,
  amount           numeric(14,2) not null default 0,
  currency         text          not null default 'CDF',
  mileage_km       numeric(10,2) not null default 0,
  revenue_cdf      numeric(14,2) not null default 0,
  fuel_cdf         numeric(14,2) not null default 0,
  maintenance_cdf  numeric(14,2) not null default 0,
  notes            text,
  created_at       timestamptz   not null default now()
);

-- Colonnes qui peuvent manquer
alter table public.daily_entries
  add column if not exists amount          numeric(14,2) not null default 0,
  add column if not exists currency        text          not null default 'CDF',
  add column if not exists mileage_km      numeric(10,2) not null default 0,
  add column if not exists revenue_cdf     numeric(14,2) not null default 0,
  add column if not exists fuel_cdf        numeric(14,2) not null default 0,
  add column if not exists maintenance_cdf numeric(14,2) not null default 0,
  add column if not exists driver_id       uuid          null,
  add column if not exists notes           text;

-- Check devise
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_entries_currency_check'
      and conrelid = 'public.daily_entries'::regclass
  ) then
    alter table public.daily_entries
      add constraint daily_entries_currency_check
      check (currency in ('CDF', 'USD')) not valid;
  end if;
end $$;

alter table public.daily_entries validate constraint daily_entries_currency_check;

-- Unicité : 1 versement par véhicule par jour par propriétaire
create unique index if not exists daily_entries_owner_vehicle_date_key
  on public.daily_entries (owner_id, vehicle_id, entry_date);

-- Indexes de performance
create index if not exists daily_entries_owner_date_idx
  on public.daily_entries (owner_id, entry_date desc);

create index if not exists daily_entries_vehicle_date_idx
  on public.daily_entries (vehicle_id, entry_date desc);

create index if not exists daily_entries_driver_date_idx
  on public.daily_entries (driver_id, entry_date desc)
  where driver_id is not null;

-- RLS
alter table public.daily_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'daily_entries'
      and policyname = 'daily_entries_owner_all'
  ) then
    create policy daily_entries_owner_all
      on public.daily_entries
      for all
      to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'daily_entries'
      and policyname = 'daily_entries_driver_select'
  ) then
    create policy daily_entries_driver_select
      on public.daily_entries
      for select
      to authenticated
      using (driver_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'daily_entries'
      and policyname = 'daily_entries_driver_insert'
  ) then
    create policy daily_entries_driver_insert
      on public.daily_entries
      for insert
      to authenticated
      with check (
        driver_id = auth.uid()
        and exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.driver_id = auth.uid()
        )
      );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5. TABLE public.breakdowns  (pannes et maintenance)
-- Référencée par : breakdowns.ts, investor-dashboard.ts, data.ts
-- ----------------------------------------------------------------------------

create table if not exists public.breakdowns (
  id             uuid                    primary key default gen_random_uuid(),
  vehicle_id     uuid                    not null references public.vehicles (id) on delete cascade,
  reported_by    uuid                    not null references auth.users (id) on delete restrict,
  type           text                    not null,
  description    text,
  estimated_cost numeric(14,2)           not null default 0,
  status         public.breakdown_status not null default 'open',
  created_at     timestamptz             not null default now()
);

-- Colonnes qui peuvent manquer
alter table public.breakdowns
  add column if not exists description    text,
  add column if not exists estimated_cost numeric(14,2) not null default 0;

-- Correction du type de la colonne status si elle était TEXT
do $$
begin
  -- Si la colonne status est de type text (ancienne migration), la convertir
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'breakdowns'
      and column_name  = 'status'
      and data_type    = 'text'
  ) then
    -- Mettre à jour les valeurs hors enum avant la conversion
    execute 'update public.breakdowns
             set status = ''open''
             where status not in (''open'', ''in_progress'', ''resolved'')';
    execute 'alter table public.breakdowns
             alter column status type public.breakdown_status
             using status::public.breakdown_status';
  end if;
end $$;

-- Indexes
create index if not exists breakdowns_vehicle_id_idx
  on public.breakdowns (vehicle_id);

create index if not exists breakdowns_reported_by_idx
  on public.breakdowns (reported_by);

create index if not exists breakdowns_status_idx
  on public.breakdowns (status);

create index if not exists breakdowns_vehicle_status_idx
  on public.breakdowns (vehicle_id, status);

-- RLS breakdowns
alter table public.breakdowns enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'breakdowns'
      and policyname = 'breakdowns_driver_insert'
  ) then
    create policy breakdowns_driver_insert
      on public.breakdowns
      for insert
      to authenticated
      with check (
        reported_by = auth.uid()
        and exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.driver_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'breakdowns'
      and policyname = 'breakdowns_driver_select_own'
  ) then
    create policy breakdowns_driver_select_own
      on public.breakdowns
      for select
      to authenticated
      using (reported_by = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'breakdowns'
      and policyname = 'breakdowns_owner_select'
  ) then
    create policy breakdowns_owner_select
      on public.breakdowns
      for select
      to authenticated
      using (
        exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'breakdowns'
      and policyname = 'breakdowns_owner_insert'
  ) then
    create policy breakdowns_owner_insert
      on public.breakdowns
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'breakdowns'
      and policyname = 'breakdowns_owner_update'
  ) then
    create policy breakdowns_owner_update
      on public.breakdowns
      for update
      to authenticated
      using (
        exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'breakdowns'
      and policyname = 'breakdowns_owner_delete'
  ) then
    create policy breakdowns_owner_delete
      on public.breakdowns
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.owner_id = auth.uid()
        )
      );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6. FONCTION RPC : report_breakdown_transaction
-- Utilisée par : breakdowns.ts → supabase.rpc("report_breakdown_transaction")
-- CREATE OR REPLACE est intrinsèquement idempotent.
-- ----------------------------------------------------------------------------

create or replace function public.report_breakdown_transaction(
  p_vehicle_id    uuid,
  p_type          text,
  p_description   text    default null,
  p_estimated_cost numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  -- Vérification authentification
  if auth.uid() is null then
    raise exception 'not_authenticated' using hint = 'Vous devez etre connecte pour signaler une panne.';
  end if;

  -- Vérification que le chauffeur est bien assigné à ce véhicule
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id
      and v.driver_id = auth.uid()
  ) then
    raise exception 'not_authorized' using hint = 'Ce vehicule ne vous est pas assigne.';
  end if;

  -- Insertion de la panne
  insert into public.breakdowns (
    vehicle_id,
    reported_by,
    type,
    description,
    estimated_cost,
    status
  )
  values (
    p_vehicle_id,
    auth.uid(),
    p_type,
    p_description,
    coalesce(p_estimated_cost, 0),
    'open'::public.breakdown_status
  )
  returning id into new_id;

  -- Passage du véhicule en maintenance
  update public.vehicles
  set status = 'maintenance'
  where id = p_vehicle_id;

  return new_id;
end;
$$;

-- Permissions sur la fonction RPC
revoke all on function public.report_breakdown_transaction(uuid, text, text, numeric) from public;
grant execute on function public.report_breakdown_transaction(uuid, text, text, numeric) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. TRIGGER : auto-création du profil lors de l'inscription Auth
-- Évite les erreurs de FK quand un utilisateur s'inscrit et que le profil
-- n'a pas encore été créé manuellement.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    coalesce(new.raw_user_meta_data->>'phone', null),
    coalesce(new.raw_user_meta_data->>'role', 'driver')
  )
  on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, profiles.full_name),
      phone     = coalesce(excluded.phone,     profiles.phone),
      role      = coalesce(excluded.role,      profiles.role);

  return new;
end;
$$;

-- Création du trigger uniquement s'il n'existe pas déjà
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 8. NOTIFICATION POSTGREST — Rechargement du cache de schéma
-- Indispensable pour que les nouvelles colonnes soient visibles immédiatement
-- via l'API Supabase sans redémarrer le serveur.
-- ----------------------------------------------------------------------------

notify pgrst, 'reload schema';
