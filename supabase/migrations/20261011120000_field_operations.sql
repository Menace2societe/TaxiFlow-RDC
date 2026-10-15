-- =============================================================================
-- TaxiFlow-RDC — Opérations terrain
--
-- 1. Paiements Mobile Money (M-Pesa, Airtel Money, Orange Money via pawaPay)
-- 2. Photo du compteur + revue des recettes suspectes
-- 3. Dépenses par véhicule (carburant, entretien…)
-- 4. Contrats location-vente : versement journalier attendu
-- 5. Date d'expiration des documents légaux
-- 6. Journal des notifications (WhatsApp) pour ne jamais envoyer deux fois
-- 7. Statuts de véhicules ramenés à en service / maintenance / repos
--
-- Idempotent, et tolérant aux écarts de la base de production : payments.source
-- peut y être du texte (sans le type payment_source), et les véhicules peuvent
-- encore avoir les anciens statuts active / inactive.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Mobile Money
-- ----------------------------------------------------------------------------

-- payments.source accepte « mobile_money », que la colonne soit un enum ou du texte.
alter table public.payments
  add column if not exists source text not null default 'automated';

do $$
declare
  source_type text;
  constraint_row record;
begin
  select c.udt_name into source_type
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'payments' and c.column_name = 'source';

  if source_type = 'payment_source' then
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'payment_source' and e.enumlabel = 'mobile_money'
    ) then
      alter type public.payment_source add value 'mobile_money';
    end if;
  else
    -- Colonne texte : on remplace toute contrainte CHECK sur source qui ignore mobile_money.
    for constraint_row in
      select conname from pg_constraint
      where conrelid = 'public.payments'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%source%'
        and pg_get_constraintdef(oid) not ilike '%mobile_money%'
    loop
      execute format('alter table public.payments drop constraint %I', constraint_row.conname);
    end loop;

    if not exists (
      select 1 from pg_constraint
      where conrelid = 'public.payments'::regclass and conname = 'payments_source_check'
    ) then
      alter table public.payments
        add constraint payments_source_check
        check (source in ('automated', 'manual_backup', 'mobile_money')) not valid;
    end if;
  end if;
end $$;

create table if not exists public.mobile_money_transactions (
  -- = depositId pawaPay (UUIDv4) : rend l'initiation idempotente
  id                      uuid          primary key,
  driver_id               uuid          not null references public.profiles (id) on delete restrict,
  vehicle_id              uuid          not null references public.vehicles (id) on delete cascade,
  investor_id             uuid          not null references auth.users (id) on delete cascade,
  amount                  numeric(14,2) not null check (amount > 0),
  currency                text          not null check (currency in ('CDF', 'USD')),
  provider                text          not null check (provider in ('VODACOM_MPESA_COD', 'AIRTEL_COD', 'ORANGE_COD')),
  phone                   text          not null,
  status                  text          not null default 'initiated'
                                        check (status in ('initiated', 'accepted', 'completed', 'failed', 'rejected')),
  failure_reason          text,
  provider_transaction_id text,
  payment_id              uuid          references public.payments (id) on delete set null,
  created_at              timestamptz   not null default now(),
  updated_at              timestamptz   not null default now()
);

create index if not exists mobile_money_driver_idx on public.mobile_money_transactions (driver_id, created_at desc);
create index if not exists mobile_money_investor_idx on public.mobile_money_transactions (investor_id, created_at desc);

-- Lecture seule pour les utilisateurs : les écritures passent par le serveur
-- (service role) après vérification auprès de pawaPay.
alter table public.mobile_money_transactions enable row level security;

drop policy if exists mobile_money_driver_select on public.mobile_money_transactions;
create policy mobile_money_driver_select
  on public.mobile_money_transactions
  for select
  to authenticated
  using (driver_id = auth.uid());

drop policy if exists mobile_money_investor_select on public.mobile_money_transactions;
create policy mobile_money_investor_select
  on public.mobile_money_transactions
  for select
  to authenticated
  using (investor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Photo du compteur + revue des recettes suspectes
-- ----------------------------------------------------------------------------

alter table public.daily_entries
  add column if not exists odometer_photo_path text,
  add column if not exists review_status       text,
  add column if not exists review_note         text,
  add column if not exists reviewed_at         timestamptz,
  add column if not exists reviewed_by         uuid references auth.users (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_entries_review_status_check'
      and conrelid = 'public.daily_entries'::regclass
  ) then
    alter table public.daily_entries
      add constraint daily_entries_review_status_check
      check (review_status is null or review_status in ('justified', 'fraud'));
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('odometer-photos', 'odometer-photos', false)
on conflict (id) do update set public = false;

-- Chemin : <driver_id>/<fichier>
drop policy if exists odometer_driver_insert on storage.objects;
create policy odometer_driver_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'odometer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists odometer_driver_read on storage.objects;
create policy odometer_driver_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'odometer-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists odometer_owner_read on storage.objects;
create policy odometer_owner_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'odometer-photos'
    and exists (
      select 1 from public.daily_entries e
      where e.odometer_photo_path = storage.objects.name
        and e.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Dépenses par véhicule
-- ----------------------------------------------------------------------------

create table if not exists public.vehicle_expenses (
  id           uuid          primary key default gen_random_uuid(),
  owner_id     uuid          not null references auth.users (id) on delete cascade,
  vehicle_id   uuid          not null references public.vehicles (id) on delete cascade,
  expense_date date          not null,
  category     text          not null check (category in ('carburant', 'entretien', 'reparation', 'assurance', 'taxe', 'autre')),
  amount_cdf   numeric(14,2) not null check (amount_cdf > 0),
  note         text,
  created_by   uuid          references auth.users (id) on delete set null,
  created_at   timestamptz   not null default now()
);

create index if not exists vehicle_expenses_owner_date_idx on public.vehicle_expenses (owner_id, expense_date desc);
create index if not exists vehicle_expenses_vehicle_idx on public.vehicle_expenses (vehicle_id, expense_date desc);

alter table public.vehicle_expenses enable row level security;

drop policy if exists vehicle_expenses_owner_all on public.vehicle_expenses;
create policy vehicle_expenses_owner_all
  on public.vehicle_expenses
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 4. Contrats location-vente
-- ----------------------------------------------------------------------------

alter table public.driver_contracts
  add column if not exists daily_amount_cdf numeric(14,2),
  add column if not exists notes text;

create index if not exists driver_contracts_owner_idx on public.driver_contracts (owner_id, status, created_at desc);

-- ----------------------------------------------------------------------------
-- 5. Expiration des documents
-- ----------------------------------------------------------------------------

alter table public.legal_documents
  add column if not exists expires_at date;

create index if not exists legal_documents_expiry_idx
  on public.legal_documents (owner_id, expires_at)
  where expires_at is not null;

-- ----------------------------------------------------------------------------
-- 6. Journal des notifications
-- ----------------------------------------------------------------------------

create table if not exists public.notification_log (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references auth.users (id) on delete cascade,
  channel    text        not null check (channel in ('whatsapp')),
  -- ex. "document_expiry:<id>:7" ou "suspicious_entry:<id>"
  dedupe_key text        not null,
  message    text        not null,
  status     text        not null check (status in ('sent', 'failed', 'skipped')),
  error      text,
  created_at timestamptz not null default now(),
  unique (channel, dedupe_key)
);

alter table public.notification_log enable row level security;

drop policy if exists notification_log_owner_select on public.notification_log;
create policy notification_log_owner_select
  on public.notification_log
  for select
  to authenticated
  using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 7. Statuts de véhicules (« Statut inconnu » à l'écran sinon)
-- ----------------------------------------------------------------------------

alter table public.vehicles drop constraint if exists vehicles_status_check;

update public.vehicles
set status = case
  when lower(trim(status)) in ('en service', 'en_service', 'active', 'actif', 'service') then 'en service'
  when lower(trim(status)) in ('maintenance', 'en maintenance', 'en panne', 'panne', 'garage') then 'maintenance'
  else 'repos'
end
where status is null or status not in ('en service', 'maintenance', 'repos');

alter table public.vehicles alter column status set default 'repos';

alter table public.vehicles
  add constraint vehicles_status_check
  check (status in ('repos', 'en service', 'maintenance'));

notify pgrst, 'reload schema';
