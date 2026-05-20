"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

const allowed: UserRole[] = ["investor", "driver"];

export async function registerPartner(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "driver") as UserRole;

  if (!allowed.includes(role)) {
    redirect(`${ROUTES.REGISTER}?error=Role%20invalide.`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role
      }
    }
  });

  if (error) {
    redirect(`${ROUTES.REGISTER}?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await (supabase.from("profiles") as any).upsert({
      id: data.user.id,
      full_name: fullName || null,
      phone: phone || null,
      role
    });
  }

  redirect(`${ROUTES.LOGIN}?notice=Compte%20cree.%20Verifiez%20votre%20email%20si%20la%20confirmation%20est%20active.`);
}
