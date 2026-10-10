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
    const isOwnerDriver = role === "driver" && formData.get("is_owner_driver") === "on";

    if (!allowed.includes(role)) {
      redirect(`${ROUTES.REGISTER}?error=Role%20invalide.`);
    }

    if (!email || !password) {
      redirect(`${ROUTES.REGISTER}?error=Email%20et%20mot%20de%20passe%20requis.`);
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
          phone: phone || null,
          role,
          is_owner_driver: isOwnerDriver
        }
      }
    });

    if (error) {
      redirect(`${ROUTES.REGISTER}?error=${encodeURIComponent(error.message)}`);
    }

    // Le profil (rôle, chauffeur-patron) est créé par le trigger handle_new_user
    // à partir des métadonnées ci-dessus, puis ne peut plus changer.

    redirect(
      `${ROUTES.LOGIN}?notice=Compte%20cree.%20Verifiez%20votre%20email%20si%20la%20confirmation%20est%20active.`
    );
  } catch (error) {
    // Les erreurs de redirect() ne sont pas de vraies erreurs — on les laisse passer.
    throw error;
  }
}
