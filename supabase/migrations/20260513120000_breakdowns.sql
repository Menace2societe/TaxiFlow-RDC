-- Breakdowns (maintenance), unique plates per owner, transactional RPC, RLS

create type public.breakdown_status as enum ('open', 'in_progress', 'resolved');

create table if not exists public.breakdowns (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  reported_by uuid not null references auth.users (id) on delete restrict,
  type text not null,
  description text,
  estimated_cost numeric(14, 2) not null default 0,
  status public.breakdown_status not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists breakdowns_vehicle_id_idx on public.breakdowns (vehicle_id);
create index if not exists breakdowns_reported_by_idx on public.breakdowns (reported_by);
create index if not exists breakdowns_status_idx on public.breakdowns (status);

-- Normalized plate uniqueness per owner (run after cleaning duplicate plates if any)
create unique index if not exists vehicles_owner_plate_normalized_uidx
  on public.vehicles (owner_id, upper(replace(plate_number, ' ', '')));

alter table public.breakdowns enable row level security;

-- Chauffeur : insertion uniquement sur son véhicule assigné
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

-- Chauffeur : lecture de ses propres signalements
create policy breakdowns_driver_select_own
  on public.breakdowns
  for select
  to authenticated
  using (reported_by = auth.uid());

-- Propriétaire du véhicule : lecture
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

-- Propriétaire : insertion (ex. déclaration bureau)
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

-- Propriétaire : mise à jour
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

-- Propriétaire : suppression
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

-- RPC transactionnelle : chauffeur assigné uniquement
create or replace function public.report_breakdown_transaction(
  p_vehicle_id uuid,
  p_type text,
  p_description text default null,
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
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id
      and v.driver_id = auth.uid()
  ) then
    raise exception 'not_authorized';
  end if;

  insert into public.breakdowns (
    vehicle_id, reported_by, type, description, estimated_cost, status
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

  update public.vehicles
  set status = 'maintenance'
  where id = p_vehicle_id;

  return new_id;
end;
$$;

revoke all on function public.report_breakdown_transaction(uuid, text, text, numeric) from public;
grant execute on function public.report_breakdown_transaction(uuid, text, text, numeric) to authenticated;
