-- Suivi kilometrique anti-fraude pour les recettes journalieres.

alter table public.daily_entries
  add column if not exists start_km numeric(10,2) not null default 0,
  add column if not exists end_km numeric(10,2) not null default 0,
  add column if not exists declared_amount numeric(14,2) not null default 0;

update public.daily_entries
set
  declared_amount = coalesce(nullif(declared_amount, 0), amount, 0),
  end_km = coalesce(nullif(end_km, 0), mileage_km, 0),
  start_km = least(
    coalesce(nullif(start_km, 0), mileage_km, 0),
    coalesce(nullif(end_km, 0), mileage_km, 0)
  )
where declared_amount = 0
   or end_km = 0
   or start_km > end_km;

alter table public.daily_entries
  add column if not exists distance_covered numeric(10,2)
    generated always as (greatest(end_km - start_km, 0)) stored,
  add column if not exists is_suspicious boolean
    generated always as (
      (greatest(end_km - start_km, 0) > 50 and declared_amount <= 5000)
    ) stored;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_entries_km_order_check'
      and conrelid = 'public.daily_entries'::regclass
  ) then
    alter table public.daily_entries
      add constraint daily_entries_km_order_check
      check (end_km >= start_km) not valid;
  end if;
end $$;

alter table public.daily_entries validate constraint daily_entries_km_order_check;

create index if not exists daily_entries_suspicious_idx
  on public.daily_entries (owner_id, entry_date desc)
  where is_suspicious;

notify pgrst, 'reload schema';
