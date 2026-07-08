"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

export async function updateOwnerDriverFlag(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.DRIVER_PROFILE));
  }

  const isOwnerDriver = formData.get("is_owner_driver") === "on";
  const { error } = await supabase
    .from("profiles")
    .update({ is_owner_driver: isOwnerDriver })
    .eq("id", user.id)
    .eq("role", "driver");

  if (error) {
    redirect(`${ROUTES.DRIVER_PROFILE}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(ROUTES.DRIVER_PROFILE);
  revalidatePath(ROUTES.DRIVER_DOCUMENTS);
  revalidatePath(ROUTES.DRIVER_DASHBOARD);
  redirect(`${ROUTES.DRIVER_PROFILE}?saved=1`);
}
