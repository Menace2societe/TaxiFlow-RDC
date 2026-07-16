do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'payment_status'
      and e.enumlabel = 'validated'
  ) then
    alter type public.payment_status add value 'validated';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_source'
      and n.nspname = 'public'
  ) then
    create type public.payment_source as enum ('automated', 'manual_backup');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'revenue_session_type'
      and n.nspname = 'public'
  ) then
    create type public.revenue_session_type as enum ('driver_revenue', 'investor_revenue');
  end if;
end $$;

alter table public.payments
  add column if not exists source public.payment_source not null default 'automated',
  add column if not exists session_type public.revenue_session_type not null default 'driver_revenue',
  add column if not exists payment_date date not null default current_date,
  add column if not exists comment text,
  add column if not exists rejection_reason text,
  add column if not exists validated_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

create index if not exists payments_investor_status_created_idx
  on public.payments (investor_id, status, created_at desc);

create index if not exists payments_investor_session_date_idx
  on public.payments (investor_id, session_type, payment_date desc);

notify pgrst, 'reload schema';
