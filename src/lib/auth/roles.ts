import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

export const roleHome: Record<UserRole, string> = {
  driver: ROUTES.DRIVER_PORTAL,
  investor: ROUTES.INVESTOR_DASHBOARD,
  admin: ROUTES.DASHBOARD_OVERVIEW
};

export function getRoleHome(role: UserRole) {
  return roleHome[role];
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // La policy profiles_related_read autorise toujours la lecture de son propre profil.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,phone")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("[getCurrentProfile]", error.message);
  }

  return profile;
}

export async function requireRole(expectedRole: UserRole) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  const userRole = profile.role as UserRole;

  if (userRole !== expectedRole) {
    redirect(getRoleHome(userRole));
  }

  return profile;
}
