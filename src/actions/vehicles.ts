"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { VehicleStatus } from "@/lib/supabase/types";

export type VehicleOperationalStatus = "en service" | "maintenance" | "repos";

const operationalStatusToDatabaseStatus: Record<VehicleOperationalStatus, VehicleStatus> = {
  "en service": "active",
  maintenance: "maintenance",
  repos: "inactive"
};

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

export type VehicleActionState = {
  ok: boolean;
  message: string;
};

function revalidateFleetPaths() {
  revalidatePath(ROUTES.DASHBOARD_FLEET);
  revalidatePath(ROUTES.DASHBOARD_OVERVIEW);
  revalidatePath(ROUTES.INVESTOR_FLEET);
  revalidatePath(ROUTES.INVESTOR_DASHBOARD);
  revalidatePath(ROUTES.DRIVER_DASHBOARD);
  revalidatePath(ROUTES.DRIVER_PORTAL);
}

export async function updateVehicleStatus(vehicleId: string, status: VehicleOperationalStatus): Promise<VehicleActionState> {
  try {
    if (!vehicleId) {
      return { ok: false, message: "Vehicule introuvable." };
    }

    const databaseStatus = operationalStatusToDatabaseStatus[status];

    if (!databaseStatus) {
      return { ok: false, message: "Statut vehicule invalide." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("vehicles").update({ status: databaseStatus }).eq("id", vehicleId);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateFleetPaths();
    return { ok: true, message: "Statut du vehicule mis a jour." };
  } catch (error) {
    console.error("[updateVehicleStatus]", error);
    return {
      ok: false,
      message: "Impossible de mettre a jour le statut du vehicule."
    };
  }
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

export async function createVehicleFromInvestorDashboard(formData: FormData): Promise<VehicleActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expiree. Reconnectez-vous pour ajouter un vehicule." };
    }

    const parsed = createVehicleSchema.safeParse({
      plate_number: formData.get("plate_number"),
      label: formData.get("label"),
      type: formData.get("type"),
      target_daily_revenue: formData.get("target_daily_revenue")
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const first = Object.values(errors)[0]?.[0] ?? "Donnees invalides.";
      return { ok: false, message: first };
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
      return { ok: false, message: "Cette plaque existe deja pour votre flotte." };
    }

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateFleetPaths();
    revalidatePath(ROUTES.INVESTOR_DASHBOARD);
    return { ok: true, message: "Vehicule ajoute a votre flotte." };
  } catch (error) {
    console.error("[createVehicleFromInvestorDashboard]", error);
    return {
      ok: false,
      message: "Impossible d'ajouter le vehicule. Verifiez la connexion Supabase et la colonne vehicles.driver_id."
    };
  }
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
