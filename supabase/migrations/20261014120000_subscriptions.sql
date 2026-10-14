-- =============================================================================
-- TaxiFlow-RDC — Abonnement des investisseurs
--
-- - 30 jours d'essai gratuit à la première visite de la page Abonnement
-- - Paiement mensuel par Mobile Money (pawaPay) : paid_until avance d'autant
-- - Un admin peut prolonger à la main (paiement en espèces)
--
-- Les montants et la règle « 1er véhicule gratuit » sont dans src/lib/billing/plans.ts.
-- Idempotent.
-- =============================================================================

create table if not exists public.subscriptions (
  owner_id      uuid        primary key references auth.users (id) on delete cascade,
  trial_ends_at date        not null,
  paid_until    date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select
  on public.subscriptions
  for select
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create table if not exists public.subscription_payments (
  -- = depositId pawaPay
  id                      uuid          primary key,
  owner_id                uuid          not null references auth.users (id) on delete cascade,
  months                  integer       not null check (months between 1 and 12),
  amount                  numeric(14,2) not null check (amount > 0),
  currency                text          not null check (currency in ('CDF', 'USD')),
  provider                text          not null check (provider in ('VODACOM_MPESA_COD', 'AIRTEL_COD', 'ORANGE_COD', 'CASH')),
  phone                   text,
  status                  text          not null default 'initiated'
                                        check (status in ('initiated', 'accepted', 'completed', 'failed', 'rejected')),
  failure_reason          text,
  provider_transaction_id text,
  created_at              timestamptz   not null default now(),
  updated_at              timestamptz   not null default now()
);

create index if not exists subscription_payments_owner_idx on public.subscription_payments (owner_id, created_at desc);

alter table public.subscription_payments enable row level security;

drop policy if exists subscription_payments_owner_select on public.subscription_payments;
create policy subscription_payments_owner_select
  on public.subscription_payments
  for select
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- Crée l'essai gratuit de l'utilisateur connecté s'il n'existe pas encore.
create or replace function public.ensure_subscription()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.subscriptions (owner_id, trial_ends_at)
  values (auth.uid(), current_date + 30)
  on conflict (owner_id) do nothing;

  select * into result from public.subscriptions where owner_id = auth.uid();
  return result;
end;
$$;

revoke all on function public.ensure_subscription() from public;
grant execute on function public.ensure_subscription() to authenticated;

-- Prolonge un abonnement à partir de la date la plus tardive entre aujourd'hui,
-- la fin d'essai et la fin déjà payée : payer pendant l'essai ne fait rien perdre.
-- Réservée au serveur (service role).
create or replace function public.extend_subscription(p_owner_id uuid, p_months integer)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  new_end date;
begin
  if p_months < 1 or p_months > 12 then
    raise exception 'invalid_months';
  end if;

  insert into public.subscriptions (owner_id, trial_ends_at)
  values (p_owner_id, current_date)
  on conflict (owner_id) do nothing;

  update public.subscriptions
  set paid_until = (greatest(current_date, trial_ends_at, coalesce(paid_until, current_date)) + make_interval(months => p_months))::date,
      updated_at = now()
  where owner_id = p_owner_id
  returning paid_until into new_end;

  return new_end;
end;
$$;

revoke all on function public.extend_subscription(uuid, integer) from public, anon, authenticated;

-- Paiement en espèces enregistré par un admin.
drop function if exists public.admin_extend_subscription(uuid, integer);
create or replace function public.admin_extend_subscription(
  p_owner_id uuid,
  p_months integer,
  p_amount numeric,
  p_currency text
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  new_end date;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  if p_amount is null or p_amount <= 0 or p_currency not in ('CDF', 'USD') then
    raise exception 'invalid_amount';
  end if;

  new_end := public.extend_subscription(p_owner_id, p_months);

  insert into public.subscription_payments (id, owner_id, months, amount, currency, provider, status)
  values (gen_random_uuid(), p_owner_id, p_months, p_amount, p_currency, 'CASH', 'completed');

  return new_end;
end;
$$;

revoke all on function public.admin_extend_subscription(uuid, integer, numeric, text) from public;
grant execute on function public.admin_extend_subscription(uuid, integer, numeric, text) to authenticated;

notify pgrst, 'reload schema';
