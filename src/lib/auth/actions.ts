"use server";

import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

const rolePrefixes: Record<UserRole, string> = {
  driver: "/driver",
  investor: "/investor",
  admin: "/dashboard"
};

function getSafeRedirectPath(next: string, role: UserRole) {
  if (next.startsWith(rolePrefixes[role])) {
    return next;
  }

  return getRoleHome(role);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const supabase = await createClient();

  const authResponse = await supabase.auth.signInWithPassword({ email, password });

  console.log("[SIGN_IN] Supabase signInWithPassword response:", {
    userId: authResponse.data.user?.id ?? null,
    sessionExpiresAt: authResponse.data.session?.expires_at ?? null,
    error: authResponse.error?.message ?? null
  });

  if (authResponse.error || !authResponse.data.user) {
    const message = authResponse.error?.message ?? "Connexion impossible.";
    redirect(`/login?error=${encodeURIComponent(message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  const userId = authResponse.data.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", userId)
    .single();

  console.log("[SIGN_IN] Forced profile read after login:", {
    userId,
    role: profile?.role ?? null,
    error: profileError?.message ?? null
  });

  if (profileError || !profile?.role) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(
        "Aucun role associe a ce compte. Veuillez verifier votre profil ou contacter l'administrateur."
      )}`
    );
  }

  redirect(getSafeRedirectPath(next, profile.role));
}
