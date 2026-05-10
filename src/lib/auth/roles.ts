import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export const roleHome: Record<UserRole, string> = {
  driver: "/driver/dashboard",
  investor: "/investor/dashboard",
  admin: "/dashboard/overview"
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,role,phone")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function requireRole(expectedRole: UserRole) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const userProfile = profile as any;

  if (userProfile.role !== expectedRole) {
    redirect(getRoleHome(userProfile.role));
  }

  return profile;
}
