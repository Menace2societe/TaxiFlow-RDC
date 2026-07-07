do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_status'
      and n.nspname = 'public'
  ) then
    create type public.payment_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.payments (
  id          uuid                  primary key default gen_random_uuid(),
  amount      numeric(14,2)         not null,
  driver_id   uuid                  not null references public.profiles (id) on delete restrict,
  vehicle_id  uuid                  not null references public.vehicles (id) on delete cascade,
  investor_id uuid                  not null references auth.users (id) on delete cascade,
  status      public.payment_status not null default 'pending',
  created_at  timestamptz           not null default now()
);

create index if not exists payments_driver_created_idx
  on public.payments (driver_id, created_at desc);

create index if not exists payments_investor_created_idx
  on public.payments (investor_id, created_at desc);

create index if not exists payments_vehicle_created_idx
  on public.payments (vehicle_id, created_at desc);

alter table public.payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_driver_insert_assigned_vehicle'
  ) then
    create policy payments_driver_insert_assigned_vehicle
      on public.payments
      for insert
      to authenticated
      with check (
        driver_id = auth.uid()
        and exists (
          select 1 from public.vehicles v
          where v.id = vehicle_id
            and v.driver_id = auth.uid()
            and v.owner_id = investor_id
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_driver_select_own'
  ) then
    create policy payments_driver_select_own
      on public.payments
      for select
      to authenticated
      using (driver_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_investor_all_own'
  ) then
    create policy payments_investor_all_own
      on public.payments
      for all
      to authenticated
      using (investor_id = auth.uid())
      with check (investor_id = auth.uid());
  end if;
end $$;

notify pgrst, 'reload schema';
