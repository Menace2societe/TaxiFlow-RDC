"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { VehicleStatus } from "@/lib/supabase/types";

const nextStatus: Record<VehicleStatus, VehicleStatus> = {
  active: "inactive",
  inactive: "active",
  maintenance: "active"
};

const createVehicleSchema = z.object({
  plate_number: z.string().min(3).transform((value) => value.trim().toUpperCase()),
  label: z.string().min(2).transform((value) => value.trim()),
  type: z.enum(["taxi", "moto"]),
  target_daily_revenue: z.coerce.number().positive()
});

const vehicleIdSchema = z.object({
  vehicle_id: z.string().uuid()
});

function revalidateFleetPaths() {
  revalidatePath(ROUTES.DASHBOARD_FLEET);
  revalidatePath(ROUTES.DASHBOARD_OVERVIEW);
  revalidatePath(ROUTES.INVESTOR_FLEET);
}

export async function toggleVehicleStatus(formData: FormData) {
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const currentStatus = String(formData.get("current_status") ?? "inactive") as VehicleStatus;

  if (!vehicleId) {
    redirect(`${ROUTES.DASHBOARD_FLEET}?error=Vehicule introuvable`);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.DASHBOARD_FLEET));
  }

  const { error } = await supabase
    .from("vehicles")
    .update({
      status: nextStatus[currentStatus] ?? "active"
    })
    .eq("id", vehicleId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`${ROUTES.DASHBOARD_FLEET}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateFleetPaths();
  redirect(`${ROUTES.DASHBOARD_FLEET}?updated=1`);
}

export async function createVehicle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.INVESTOR_FLEET));
  }

  const parsed = createVehicleSchema.safeParse({
    plate_number: formData.get("plate_number"),
    label: formData.get("label"),
    type: formData.get("type"),
    target_daily_revenue: formData.get("target_daily_revenue")
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg)[0]?.[0] ?? "Donnees invalides.";
    redirect(`${ROUTES.INVESTOR_FLEET}?error=${encodeURIComponent(first)}`);
  }

  const { error } = await supabase.from("vehicles").insert({
    owner_id: user.id,
    driver_id: null,
    plate_number: parsed.data.plate_number,
    label: parsed.data.label,
    type: parsed.data.type,
    status: "inactive",
    target_daily_revenue: parsed.data.target_daily_revenue
  });

  if (error?.code === "23505") {
    redirect(`${ROUTES.INVESTOR_FLEET}?error=Cette%20plaque%20existe%20deja%20pour%20votre%20flotte.`);
  }

  if (error) {
    redirect(`${ROUTES.INVESTOR_FLEET}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateFleetPaths();
  redirect(`${ROUTES.INVESTOR_FLEET}?created=1`);
}

export async function deleteVehicle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginWithNext(ROUTES.INVESTOR_FLEET));
  }

  const parsed = vehicleIdSchema.safeParse({
    vehicle_id: formData.get("vehicle_id")
  });

  if (!parsed.success) {
    redirect(`${ROUTES.INVESTOR_FLEET}?error=Vehicule%20invalide.`);
  }

  const { error } = await supabase.from("vehicles").delete().eq("id", parsed.data.vehicle_id).eq("owner_id", user.id);

  if (error) {
    redirect(`${ROUTES.INVESTOR_FLEET}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateFleetPaths();
  redirect(`${ROUTES.INVESTOR_FLEET}?deleted=1`);
}
