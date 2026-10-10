-- =============================================================================
-- TaxiFlow-RDC — Un admin nomme ou retire les admins depuis /dashboard/users
--
-- Le premier admin se nomme dans le SQL editor (voir README). Ensuite, seul un
-- admin peut changer le rôle d'un compte, via cette fonction. Un admin ne peut
-- pas changer son propre rôle : il reste donc toujours au moins un admin.
--
-- Idempotent : peut être rejouée sans erreur.
-- =============================================================================

create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using hint = 'Réservé aux administrateurs.';
  end if;

  if p_role not in ('driver', 'investor', 'admin') then
    raise exception 'invalid_role';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_role' using hint = 'Demandez à un autre administrateur.';
  end if;

  -- Le trigger profiles_protect_privileges laisse passer : l'appelant est admin.
  update public.profiles
  set role = p_role,
      is_owner_driver = case when p_role = 'driver' then is_owner_driver else false end
  where id = p_user_id;

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

notify pgrst, 'reload schema';
