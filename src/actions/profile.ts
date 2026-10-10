"use server";

import { createClient } from "@/lib/supabase/server";

// Le rôle et le statut chauffeur-patron sont fixés à l'inscription :
// aucune action ne permet de les modifier (voir trigger profiles_protect_privileges).

export type ChangePasswordState = {
  ok: boolean;
  message: string;
};

export async function changeMyPassword(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { ok: false, message: "Le nouveau code doit faire au moins 8 caractères." };
  }
  if (password !== confirm) {
    return { ok: false, message: "Les deux saisies ne correspondent pas." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Session expirée. Reconnectez-vous." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Code modifié. Utilisez-le à votre prochaine connexion." };
}
