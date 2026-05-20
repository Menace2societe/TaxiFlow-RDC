"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

const assignVehicleSchema = z.object({
  vehicle_id: z.string().uuid()
});

export async function assignDriverToVehicle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.INVESTOR_FLEET));
  }

  const vehicleParsed = assignVehicleSchema.safeParse({ vehicle_id: formData.get("vehicle_id") });
  if (!vehicleParsed.success) {
    redirect(`${ROUTES.INVESTOR_FLEET}?error=Donnees%20d%27assignation%20invalides.`);
  }

  const driverRaw = String(formData.get("driver_id") ?? "").trim();
  let driverId: string | null = null;
  if (driverRaw && driverRaw !== "__none__") {
    const d = z.string().uuid().safeParse(driverRaw);
    if (!d.success) {
      redirect(`${ROUTES.INVESTOR_FLEET}?error=Chauffeur%20invalide.`);
    }
    driverId = d.data;
  }

  const confirm = formData.get("confirm_reassign") === "1";

  const { data: owned, error: ownErr } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleParsed.data.vehicle_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (ownErr || !owned) {
    redirect(`${ROUTES.INVESTOR_FLEET}?error=Vehicule%20introuvable%20ou%20acces%20refuse.`);
  }

  if (driverId) {
    const { data: conflict } = await supabase
      .from("vehicles")
      .select("id,label")
      .eq("owner_id", user.id)
      .eq("driver_id", driverId)
      .neq("id", vehicleParsed.data.vehicle_id)
      .maybeSingle();

    if (conflict && !confirm) {
      redirect(
        `${ROUTES.INVESTOR_FLEET}?reassign=1&conflict_vehicle=${encodeURIComponent(conflict.id)}&target_vehicle=${encodeURIComponent(vehicleParsed.data.vehicle_id)}&driver=${encodeURIComponent(driverId)}`
      );
    }

    if (conflict && confirm) {
      const { error: clearErr } = await supabase
        .from("vehicles")
        .update({ driver_id: null })
        .eq("id", conflict.id)
        .eq("owner_id", user.id);

      if (clearErr) {
        redirect(`${ROUTES.INVESTOR_FLEET}?error=${encodeURIComponent(clearErr.message)}`);
      }
    }
  }

  const { error } = await supabase
    .from("vehicles")
    .update({ driver_id: driverId })
    .eq("id", vehicleParsed.data.vehicle_id)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`${ROUTES.INVESTOR_FLEET}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(ROUTES.INVESTOR_FLEET);
  revalidatePath(ROUTES.DRIVER_PORTAL);
  redirect(`${ROUTES.INVESTOR_FLEET}?assigned=1`);
}
