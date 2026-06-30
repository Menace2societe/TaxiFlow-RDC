-- Canonical vehicle columns expected by the Next.js UI and Server Actions.
-- Fixes PostgREST schema cache errors for missing public.vehicles.label and
-- public.vehicles.target_daily_revenue while preserving older columns if present.

alter table public.vehicles
  add column if not exists label text,
  add column if not exists target_daily_revenue numeric not null default 0;

do $$
begin
  -- Legacy compatibility: some early schemas used vehicles.name.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'name'
  ) then
    execute 'update public.vehicles set label = coalesce(label, nullif(name, '''')) where label is null';
  end if;

  -- Legacy compatibility: some early schemas used vehicles.model.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'model'
  ) then
    execute 'update public.vehicles set label = coalesce(label, nullif(model, '''')) where label is null';
  end if;

  -- Legacy compatibility: some early schemas used vehicles.daily_objective.
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

create index if not exists vehicles_owner_label_idx
  on public.vehicles (owner_id, label);

notify pgrst, 'reload schema';
