import "server-only";

import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { Database } from "@/lib/supabase/types";
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
    console.log("[AUTH] getCurrentProfile: no authenticated user.");
    return null;
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,role,phone")
    .eq("id", user.id)
    .single();

  console.log("[AUTH] getCurrentProfile:", {
    userId: user.id,
    role: profile?.role ?? null,
    error: profileError?.message ?? null
  });

  if (profileError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[AUTH] getCurrentProfile: normal profile read failed, trying service role fallback.");
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,role,phone")
      .eq("id", user.id)
      .single();

    console.log("[AUTH] getCurrentProfile service role fallback:", {
      userId: user.id,
      role: adminProfile?.role ?? null,
      error: adminError?.message ?? null
    });

    profile = adminProfile;
    profileError = adminError;
  }

  return profile;
}

export async function requireRole(expectedRole: UserRole) {
  const profile = await getCurrentProfile();

  if (!profile) {
    console.log(`[AUTH] requireRole(${expectedRole}): no profile, redirecting to /login.`);
    redirect(ROUTES.LOGIN);
  }

  const userRole = profile.role as UserRole;

  if (userRole !== expectedRole) {
    const targetPath = getRoleHome(userRole);
    console.log(`[AUTH] requireRole(${expectedRole}): detected ${userRole}, redirecting to ${targetPath}.`);
    redirect(targetPath);
  }

  console.log(`[AUTH] requireRole(${expectedRole}): access granted for role ${userRole}.`);
  return profile;
}
