-- =============================================================================
-- TaxiFlow-RDC — Règles d'accès aux recettes (daily_entries)
--
-- En production, la migration canonique n'a jamais été appliquée : aucune règle
-- RLS ne permettait à l'investisseur de lire ses propres recettes (tableau de
-- bord à 0 FC, bénéfice sans recettes, contrôle kilométrique vide), ni au
-- chauffeur de déclarer les siennes.
--
-- Recrée les trois règles attendues par l'application. Idempotent.
-- La dernière requête affiche les règles en place (résultat visible dans le SQL Editor).
-- =============================================================================

alter table public.daily_entries enable row level security;

-- Investisseur : tout sur ses recettes
drop policy if exists daily_entries_owner_all on public.daily_entries;
create policy daily_entries_owner_all
  on public.daily_entries
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Chauffeur : lit ses recettes
drop policy if exists daily_entries_driver_select on public.daily_entries;
create policy daily_entries_driver_select
  on public.daily_entries
  for select
  to authenticated
  using (driver_id = auth.uid());

-- Chauffeur : déclare une recette sur le véhicule qui lui est confié
drop policy if exists daily_entries_driver_insert on public.daily_entries;
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

notify pgrst, 'reload schema';

select policyname as regle, permissive as type, cmd as action, roles
from pg_policies
where schemaname = 'public' and tablename = 'daily_entries'
order by policyname;
