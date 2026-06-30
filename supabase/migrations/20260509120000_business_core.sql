alter table public.daily_entries
  add column if not exists amount numeric not null default 0,
  add column if not exists currency text not null default 'CDF',
  add column if not exists mileage_km numeric not null default 0;

alter table public.vehicles
  add column if not exists driver_id uuid null,
  add column if not exists label text,
  add column if not exists target_daily_revenue numeric not null default 0;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'name'
  ) then
    execute 'update public.vehicles set label = coalesce(label, nullif(name, '''')) where label is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'model'
  ) then
    execute 'update public.vehicles set label = coalesce(label, nullif(model, '''')) where label is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'daily_objective'
  ) then
    execute '
      update public.vehicles
      set target_daily_revenue = coalesce(
        nullif(target_daily_revenue, 0),
        case
          when daily_objective::text ~ ''^[0-9]+(\.[0-9]+)?$'' then daily_objective::numeric
          else null
        end,
        0
      )';
  end if;
end $$;

update public.vehicles
set label = coalesce(nullif(label, ''), 'Vehicule')
where label is null or label = '';

alter table public.vehicles
  alter column label set not null,
  alter column label set default 'Vehicule',
  alter column target_daily_revenue set default 0;

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
