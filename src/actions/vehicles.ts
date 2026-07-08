"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { VehicleStatus } from "@/lib/supabase/types";

export type VehicleOperationalStatus = "en service" | "maintenance" | "repos";

const operationalStatusToDatabaseStatus: Record<VehicleOperationalStatus, VehicleStatus> = {
  "en service": "en service",
  maintenance: "maintenance",
  repos: "repos"
};

const nextStatus: Record<VehicleStatus, VehicleStatus> = {
  "en service": "repos",
  repos: "en service",
  maintenance: "en service"
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

export async function updateVehicleStatus(vehicleId: string, status: VehicleOperationalStatus): Promise<void> {
  try {
    if (!vehicleId) {
      return;
    }

    const databaseStatus = operationalStatusToDatabaseStatus[status];

    if (!databaseStatus) {
      return;
    }

    const supabase = await createClient();
    const { error } = await supabase.from("vehicles").update({ status: databaseStatus }).eq("id", vehicleId);

    if (error) {
      console.error("[updateVehicleStatus]", error.message);
      return;
    }

    revalidateFleetPaths();
  } catch (error) {
    console.error("[updateVehicleStatus]", error);
  }
}

export async function toggleVehicleStatus(formData: FormData) {
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const currentStatus = String(formData.get("current_status") ?? "repos") as VehicleStatus;

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
      status: nextStatus[currentStatus] ?? "en service"
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
    status: "repos",
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
      status: "repos",
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

// ── Schema pour l'assignation directe par ID ──────────────────────────────────
const assignDriverByIdSchema = z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || z.string().uuid().safeParse(v).success, "UUID chauffeur invalide.")
    .transform((v) => (v === "" ? null : v))
});

export type AssignDriverActionState = {
  ok: boolean;
  message: string;
};

/**
 * Assigne (ou désassigne) un chauffeur à un véhicule en mettant à jour
 * `vehicles.driver_id`. Vérifie que le véhicule appartient à l'utilisateur.
 */
export async function assignDriverToVehicleById(
  _prev: AssignDriverActionState,
  formData: FormData
): Promise<AssignDriverActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    const parsed = assignDriverByIdSchema.safeParse({
      vehicle_id: formData.get("vehicle_id"),
      driver_id: formData.get("driver_id")
    });

    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Données invalides.";
      return { ok: false, message: first };
    }

    // Vérifier la propriété du véhicule
    const { data: owned, error: ownErr } = await supabase
      .from("vehicles")
      .select("id,label")
      .eq("id", parsed.data.vehicle_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownErr || !owned) {
      return { ok: false, message: "Véhicule introuvable ou accès refusé." };
    }

    // Libérer l'ancien véhicule si le chauffeur est déjà assigné ailleurs
    if (parsed.data.driver_id) {
      const { error: clearErr } = await supabase
        .from("vehicles")
        .update({ driver_id: null })
        .eq("owner_id", user.id)
        .eq("driver_id", parsed.data.driver_id)
        .neq("id", parsed.data.vehicle_id);

      if (clearErr) {
        console.warn("[assignDriverToVehicleById] clear conflict:", clearErr.message);
      }
    }

    const { error } = await supabase
      .from("vehicles")
      .update({ driver_id: parsed.data.driver_id })
      .eq("id", parsed.data.vehicle_id)
      .eq("owner_id", user.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateFleetPaths();
    revalidatePath(ROUTES.INVESTOR_DASHBOARD);

    const msg = parsed.data.driver_id
      ? `Chauffeur assigné à ${owned.label}.`
      : `Chauffeur retiré de ${owned.label}.`;

    return { ok: true, message: msg };
  } catch (err) {
    console.error("[assignDriverToVehicleById]", err);
    return { ok: false, message: "Assignation impossible. Vérifiez la connexion." };
  }
}
