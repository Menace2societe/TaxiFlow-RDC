-- Vehicle-driver assignment used by investor, driver, daily entry and breakdown flows.
-- This migration is idempotent and fixes PostgREST schema cache errors such as:
-- "Could not find the 'driver_id' column of 'vehicles' in the schema cache".

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

create index if not exists vehicles_driver_id_idx
  on public.vehicles (driver_id)
  where driver_id is not null;

create index if not exists vehicles_owner_driver_idx
  on public.vehicles (owner_id, driver_id);

-- Keep daily entry driver reads fast for the chauffeur portal.
create index if not exists daily_entries_driver_date_idx
  on public.daily_entries (driver_id, entry_date desc)
  where driver_id is not null;

-- Ask PostgREST/Supabase API to reload its schema cache after the migration.
notify pgrst, 'reload schema';
