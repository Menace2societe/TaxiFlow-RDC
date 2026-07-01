"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

const allowed: UserRole[] = ["investor", "driver"];

export async function registerPartner(formData: FormData) {
  try {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("full_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const role = String(formData.get("role") ?? "driver") as UserRole;

    if (!allowed.includes(role)) {
      redirect(`${ROUTES.REGISTER}?error=Role%20invalide.`);
    }

    if (!email || !password) {
      redirect(`${ROUTES.REGISTER}?error=Email%20et%20mot%20de%20passe%20requis.`);
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
          phone: phone || null,
          role
        }
      }
    });

    if (error) {
      redirect(`${ROUTES.REGISTER}?error=${encodeURIComponent(error.message)}`);
    }

    // Upsert du profil avec typage strict (phone est dans le schéma depuis la migration canonique)
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName || null,
        phone: phone || null,
        role
      });

      // On log l'erreur mais on ne bloque pas l'inscription — le trigger
      // handle_new_user() sur auth.users a déjà créé le profil de base.
      if (profileError) {
        console.warn("[registerPartner] Upsert profil non bloquant :", profileError.message);
      }
    }

    redirect(
      `${ROUTES.LOGIN}?notice=Compte%20cree.%20Verifiez%20votre%20email%20si%20la%20confirmation%20est%20active.`
    );
  } catch (error) {
    // Les erreurs de redirect() ne sont pas de vraies erreurs — on les laisse passer.
    throw error;
  }
}
