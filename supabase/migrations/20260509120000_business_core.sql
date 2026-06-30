alter table public.daily_entries
  add column if not exists amount numeric not null default 0,
  add column if not exists currency text not null default 'CDF',
  add column if not exists mileage_km numeric not null default 0;

alter table public.vehicles
  add column if not exists driver_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vehicles_driver_id_fkey'
  ) then
    alter table public.vehicles
      add constraint vehicles_driver_id_fkey
      foreign key (driver_id)
      references public.profiles (id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_entries_currency_check'
  ) then
    alter table public.daily_entries
      add constraint daily_entries_currency_check
      check (currency in ('CDF', 'USD')) not valid;
  end if;
end $$;

alter table public.daily_entries validate constraint daily_entries_currency_check;

create unique index if not exists daily_entries_owner_vehicle_date_key
  on public.daily_entries (owner_id, vehicle_id, entry_date);

create index if not exists vehicles_owner_status_idx
  on public.vehicles (owner_id, status);

create index if not exists vehicles_driver_id_idx
  on public.vehicles (driver_id)
  where driver_id is not null;

create index if not exists vehicles_owner_driver_idx
  on public.vehicles (owner_id, driver_id);

create index if not exists daily_entries_owner_date_idx
  on public.daily_entries (owner_id, entry_date desc);

create index if not exists daily_entries_driver_date_idx
  on public.daily_entries (driver_id, entry_date desc)
  where driver_id is not null;
