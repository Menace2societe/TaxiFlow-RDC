"use server";

import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { isSafeInternalPath, ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "").trim();
  const supabase = await createClient();

  const authResponse = await supabase.auth.signInWithPassword({ email, password });

  if (authResponse.error || !authResponse.data.user) {
    const message = authResponse.error?.message ?? "Connexion impossible.";
    const nextQuery = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : "";
    redirect(`${ROUTES.LOGIN}?error=${encodeURIComponent(message)}${nextQuery}`);
  }

  const userId = authResponse.data.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", userId)
    .single();

  if (profileError || !(profile as { role?: UserRole })?.role) {
    await supabase.auth.signOut();
    redirect(
      `${ROUTES.LOGIN}?error=${encodeURIComponent(
        "Aucun role associe a ce compte. Veuillez verifier votre profil ou contacter l'administrateur."
      )}`
    );
  }

  const role = (profile as { role: UserRole }).role;
  redirect(isSafeInternalPath(nextRaw) ? nextRaw : getRoleHome(role));
}
