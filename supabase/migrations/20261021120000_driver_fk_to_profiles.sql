-- =============================================================================
-- TaxiFlow-RDC — Les colonnes driver_id pointent vers les profils
--
-- En production, daily_entries.driver_id référençait encore l'ancienne table
-- public.drivers, alors que l'application enregistre l'identifiant du profil du
-- chauffeur (profiles.id = auth.users.id). Résultat : toute recette déclarée
-- avec un chauffeur était refusée.
--
-- Pour chaque table concernée :
--   1. les anciennes valeurs (drivers.id) sont converties en drivers.user_id ;
--   2. celles qui ne correspondent à aucun profil sont mises à NULL ;
--   3. la clé étrangère est recréée vers public.profiles(id).
--
-- Sans effet sur une base où driver_id pointe déjà vers profiles. Idempotent.
-- =============================================================================

do $$
declare
  target text;
  constraint_row record;
  has_legacy_drivers boolean := to_regclass('public.drivers') is not null;
begin
  foreach target in array array['daily_entries', 'payments', 'vehicles', 'breakdowns', 'driver_contracts'] loop
    if to_regclass('public.' || target) is null then
      continue;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target and column_name = 'driver_id'
    ) then
      continue;
    end if;

    -- Clés étrangères de driver_id qui ne visent pas profiles.
    for constraint_row in
      select c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.conrelid = ('public.' || target)::regclass
        and c.contype = 'f'
        and a.attname = 'driver_id'
        and c.confrelid <> 'public.profiles'::regclass
    loop
      execute format('alter table public.%I drop constraint %I', target, constraint_row.conname);
    end loop;

    if has_legacy_drivers and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'drivers' and column_name = 'user_id'
    ) then
      execute format(
        'update public.%I t set driver_id = d.user_id
         from public.drivers d
         where t.driver_id = d.id
           and d.user_id is not null
           and not exists (select 1 from public.profiles p where p.id = t.driver_id)',
        target
      );
    end if;

    -- payments.driver_id est NOT NULL : on ne peut pas y mettre NULL, on laisse
    -- la contrainte en NOT VALID pour ne pas bloquer sur d'éventuels orphelins.
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target and column_name = 'driver_id' and is_nullable = 'YES'
    ) then
      execute format(
        'update public.%I t set driver_id = null
         where driver_id is not null
           and not exists (select 1 from public.profiles p where p.id = t.driver_id)',
        target
      );
    end if;

    if not exists (
      select 1
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.conrelid = ('public.' || target)::regclass
        and c.contype = 'f'
        and a.attname = 'driver_id'
        and c.confrelid = 'public.profiles'::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (driver_id) references public.profiles (id) on delete %s not valid',
        target,
        target || '_driver_id_fkey',
        case when target = 'payments' then 'restrict' else 'set null' end
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
