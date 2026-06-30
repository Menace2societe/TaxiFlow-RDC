"use server";

import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { Database } from "@/lib/supabase/types";

const assignVehicleSchema = z.object({
  vehicle_id: z.string().uuid()
});

const phoneRegex = /^\+243[0-9]{9}$/;

const driverPhoneAssignmentSchema = z.object({
  vehicle_id: z.string().uuid(),
  full_name: z.string().min(2, "Le nom du chauffeur est obligatoire.").max(120).transform((value) => value.trim()),
  phone: z
    .string()
    .transform((value) => value.replace(/\s+/g, ""))
    .refine((value) => phoneRegex.test(value), "Le telephone doit etre au format RDC +243 suivi de 9 chiffres."),
  confirm_reassign: z.coerce.boolean().default(false)
});

export type DriverAssignmentActionState = {
  ok: boolean;
  message: string;
};

function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

function normalizePhone(phone: string | null | undefined) {
  return (phone ?? "").replace(/\s+/g, "");
}

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

export async function registerOrAssignDriverByPhone(formData: FormData): Promise<DriverAssignmentActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expiree. Reconnectez-vous pour associer un chauffeur." };
    }

    const parsed = driverPhoneAssignmentSchema.safeParse({
      vehicle_id: formData.get("vehicle_id"),
      full_name: formData.get("full_name"),
      phone: formData.get("phone"),
      confirm_reassign: formData.get("confirm_reassign") === "1"
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const first = Object.values(errors)[0]?.[0] ?? "Donnees invalides.";
      return { ok: false, message: first };
    }

    const { data: ownedVehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id,label")
      .eq("id", parsed.data.vehicle_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (vehicleError || !ownedVehicle) {
      return { ok: false, message: vehicleError?.message ?? "Vehicule introuvable ou acces refuse." };
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,full_name,phone,role");

    if (profilesError) {
      return { ok: false, message: profilesError.message };
    }

    let driver = (profiles ?? []).find((profile) => normalizePhone(profile.phone) === parsed.data.phone) ?? null;

    if (!driver) {
      const serviceClient = createServiceClient();
      if (!serviceClient) {
        return {
          ok: false,
          message: "Aucun chauffeur avec ce telephone. Configurez SUPABASE_SERVICE_ROLE_KEY pour inscrire un nouveau chauffeur depuis ce portail."
        };
      }

      const { data: createdUser, error: createUserError } = await serviceClient.auth.admin.createUser({
        phone: parsed.data.phone,
        phone_confirm: true,
        user_metadata: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          role: "driver"
        }
      });

      if (createUserError || !createdUser.user) {
        return { ok: false, message: createUserError?.message ?? "Creation du compte chauffeur impossible." };
      }

      const { error: profileError } = await serviceClient.from("profiles").upsert({
        id: createdUser.user.id,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        role: "driver"
      });

      if (profileError) {
        return { ok: false, message: profileError.message };
      }

      driver = {
        id: createdUser.user.id,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        role: "driver"
      };
    }

    if (driver.role !== "driver") {
      return { ok: false, message: "Ce numero est deja lie a un compte qui n'est pas chauffeur." };
    }

    const { data: conflict, error: conflictError } = await supabase
      .from("vehicles")
      .select("id,label,plate_number")
      .eq("owner_id", user.id)
      .eq("driver_id", driver.id)
      .neq("id", parsed.data.vehicle_id)
      .maybeSingle();

    if (conflictError) {
      return { ok: false, message: conflictError.message };
    }

    if (conflict && !parsed.data.confirm_reassign) {
      return {
        ok: false,
        message: `Ce chauffeur est deja associe a ${conflict.label} (${conflict.plate_number}). Cochez la confirmation pour le reassigner.`
      };
    }

    if (conflict) {
      const { error: clearError } = await supabase
        .from("vehicles")
        .update({ driver_id: null })
        .eq("id", conflict.id)
        .eq("owner_id", user.id);

      if (clearError) {
        return { ok: false, message: clearError.message };
      }
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ driver_id: driver.id })
      .eq("id", parsed.data.vehicle_id)
      .eq("owner_id", user.id);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    revalidatePath(ROUTES.INVESTOR_DASHBOARD);
    revalidatePath(ROUTES.INVESTOR_FLEET);
    revalidatePath(ROUTES.DRIVER_PORTAL);

    return { ok: true, message: `${driver.full_name ?? parsed.data.full_name} est associe a ${ownedVehicle.label}.` };
  } catch (error) {
    console.error("[registerOrAssignDriverByPhone]", error);
    return {
      ok: false,
      message: "Association impossible. Verifiez la configuration Supabase et la migration vehicles.driver_id."
    };
  }
}
