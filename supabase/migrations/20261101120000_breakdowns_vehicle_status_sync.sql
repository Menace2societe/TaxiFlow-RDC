-- Remise en service après réparation.
--
-- En production, un déclencheur absent du dépôt réécrit le statut du véhicule
-- quand une panne change de statut, avec une valeur que vehicles_status_check
-- refuse ('repos', 'en service', 'maintenance' seulement). Clôturer une panne
-- échouait donc avec « violates check constraint "vehicles_status_check" ».
--
-- 1. Retire tout déclencheur de public.breakdowns dont la fonction modifie
--    public.vehicles (ici, l'ancien déclencheur inconnu du dépôt).
-- 2. Le remplace par un déclencheur versionné qui n'écrit que des statuts
--    autorisés :
--    - panne ouverte ou en cours → véhicule « maintenance » ;
--    - dernière panne active résolue → véhicule « en service » (s'il était en maintenance).

do $$
declare
  t record;
begin
  for t in
    select tg.tgname
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    where tg.tgrelid = 'public.breakdowns'::regclass
      and not tg.tgisinternal
      and p.prosrc ~* 'vehicles'
  loop
    execute format('drop trigger if exists %I on public.breakdowns', t.tgname);
  end loop;
end
$$;

create or replace function public.sync_vehicle_status_from_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text in ('open', 'in_progress') then
    update public.vehicles
    set status = 'maintenance'
    where id = new.vehicle_id and status is distinct from 'maintenance';
  elsif new.status::text = 'resolved' and not exists (
    select 1
    from public.breakdowns b
    where b.vehicle_id = new.vehicle_id
      and b.id <> new.id
      and b.status::text <> 'resolved'
  ) then
    update public.vehicles
    set status = 'en service'
    where id = new.vehicle_id and status = 'maintenance';
  end if;
  return new;
end;
$$;

drop trigger if exists breakdowns_sync_vehicle_status on public.breakdowns;
create trigger breakdowns_sync_vehicle_status
  after insert or update of status on public.breakdowns
  for each row
  execute function public.sync_vehicle_status_from_breakdown();

notify pgrst, 'reload schema';
