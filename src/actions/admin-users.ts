"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

export type SetUserRoleState = {
  ok: boolean;
  message: string;
};

const setUserRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["driver", "investor", "admin"])
});

const roleLabels = { driver: "chauffeur", investor: "investisseur", admin: "administrateur" } as const;

const errorMessages: Record<string, string> = {
  not_authorized: "Action réservée aux administrateurs.",
  cannot_change_own_role: "Vous ne pouvez pas changer votre propre rôle. Demandez à un autre administrateur.",
  invalid_role: "Rôle invalide.",
  profile_not_found: "Utilisateur introuvable."
};

/**
 * Change le rôle d'un utilisateur. Toutes les vérifications (appelant admin,
 * pas son propre rôle) sont faites en base par public.set_user_role.
 */
export async function setUserRole(_prev: SetUserRoleState, formData: FormData): Promise<SetUserRoleState> {
  const parsed = setUserRoleSchema.safeParse({
    user_id: formData.get("user_id"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    return { ok: false, message: "Données invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: parsed.data.user_id,
    p_role: parsed.data.role
  });

  if (error) {
    const code = Object.keys(errorMessages).find((key) => error.message.includes(key));
    return { ok: false, message: code ? errorMessages[code] : error.message };
  }

  revalidatePath(ROUTES.DASHBOARD_USERS);
  return { ok: true, message: `Rôle changé : ${roleLabels[parsed.data.role]}.` };
}
