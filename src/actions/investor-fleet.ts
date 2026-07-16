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

export type LinkDriverActionState = {
  ok: boolean;
  message: string;
  driver?: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
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

function revalidateFleetAssignmentViews() {
  revalidatePath(ROUTES.INVESTOR_FLEET, "layout");
  revalidatePath(ROUTES.INVESTOR_DASHBOARD, "layout");
  revalidatePath(ROUTES.DRIVER_PORTAL, "layout");
  revalidatePath(ROUTES.DRIVER_DASHBOARD, "layout");
}

async function syncAssignedDriverProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  driverId: string
) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "driver" })
    .eq("id", driverId);

  if (!error) {
    return;
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    console.warn("[syncAssignedDriverProfile] Profil non synchronise :", error.message);
    return;
  }

  const { error: serviceError } = await serviceClient
    .from("profiles")
    .update({ role: "driver" })
    .eq("id", driverId);

  if (serviceError) {
    console.warn("[syncAssignedDriverProfile] Echec service role :", serviceError.message);
  }
}

/**
 * Permet à un investisseur d'inviter ou de trouver un chauffeur par son numéro
 * de téléphone (+243XXXXXXXXX) ou son UUID.
 * Si le chauffeur n'existe pas encore, il est créé via le service role.
 * La liaison effective se fait ensuite via l'assignation à un véhicule.
 */
export async function linkDriverToInvestor(
  _prev: LinkDriverActionState,
  formData: FormData
): Promise<LinkDriverActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous pour lier un chauffeur." };
    }

    // Vérifier que l'utilisateur est bien investisseur
    const { data: investorProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id,role,is_owner_driver")
      .eq("id", user.id)
      .maybeSingle();

    console.log("[DEBUG LIAISON] Profil utilisateur connecté :", investorProfile);

    if (profileError) {
      console.warn("[DEBUG LIAISON] Erreur lecture profil :", profileError.message);
    }

    // Toute session authentifiee peut rechercher un chauffeur ici. L'assignation
    // reste securisee plus bas par owner_id sur le vehicule cible.

    const rawIdentifier = String(formData.get("identifier") ?? "").trim();
    const fullName = String(formData.get("full_name") ?? "").trim();

    if (!rawIdentifier) {
      return { ok: false, message: "Renseignez le numéro de téléphone ou l'UUID du chauffeur." };
    }

    // Normaliser l'identifiant : téléphone (+243...) ou UUID
    const normalizedPhone = rawIdentifier.startsWith("+")
      ? rawIdentifier.replace(/\s+/g, "")
      : rawIdentifier.startsWith("0")
        ? "+243" + rawIdentifier.slice(1).replace(/\s+/g, "")
        : rawIdentifier;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedPhone);
    const isPhone = phoneRegex.test(normalizedPhone);

    if (!isUUID && !isPhone) {
      return {
        ok: false,
        message: "Format invalide. Utilisez le format +243XXXXXXXXX ou l'UUID du chauffeur."
      };
    }

    // Rechercher le chauffeur par téléphone ou UUID
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,full_name,phone,role");

    if (profilesError) {
      return { ok: false, message: profilesError.message };
    }

    let driver: { id: string; full_name: string | null; phone: string | null; role: string } | null = null;

    if (isUUID) {
      driver = (profiles ?? []).find((p) => p.id === normalizedPhone) ?? null;
    } else {
      driver = (profiles ?? []).find((p) => normalizePhone(p.phone) === normalizedPhone) ?? null;
    }

    // Si non trouvé, créer via service role
    if (!driver) {
      if (!isPhone) {
        return { ok: false, message: "Aucun chauffeur trouvé avec cet identifiant." };
      }

      const serviceClient = createServiceClient();
      if (!serviceClient) {
        return {
          ok: false,
          message:
            "Aucun chauffeur avec ce telephone. Configurez SUPABASE_SERVICE_ROLE_KEY pour inscrire un nouveau chauffeur."
        };
      }

      if (!fullName || fullName.length < 2) {
        return { ok: false, message: "Le nom complet est requis pour créer un nouveau chauffeur." };
      }

      const { data: createdUser, error: createError } = await serviceClient.auth.admin.createUser({
        phone: normalizedPhone,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: normalizedPhone,
          role: "driver"
        }
      });

      if (createError || !createdUser.user) {
        return { ok: false, message: createError?.message ?? "Création du compte chauffeur impossible." };
      }

      const { error: upsertError } = await serviceClient.from("profiles").upsert({
        id: createdUser.user.id,
        full_name: fullName,
        phone: normalizedPhone,
        role: "driver"
      });

      if (upsertError) {
        return { ok: false, message: upsertError.message };
      }

      driver = {
        id: createdUser.user.id,
        full_name: fullName,
        phone: normalizedPhone,
        role: "driver"
      };
    }

    if (driver.role !== "driver") {
      return { ok: false, message: "Ce compte n'est pas un chauffeur et ne peut pas être lié." };
    }

    // Vérifier si le chauffeur est déjà lié à un véhicule de cet investisseur
    const { data: existingLink } = await supabase
      .from("vehicles")
      .select("id,label")
      .eq("owner_id", user.id)
      .eq("driver_id", driver.id)
      .maybeSingle();

    if (existingLink) {
      return {
        ok: true,
        message: `${driver.full_name ?? "Ce chauffeur"} est déjà dans votre équipe (véhicule : ${existingLink.label}).`,
        driver: { id: driver.id, full_name: driver.full_name, phone: driver.phone }
      };
    }

    revalidatePath(ROUTES.INVESTOR_FLEET, "layout");

    return {
      ok: true,
      message: `${driver.full_name ?? normalizedPhone} a été trouvé. Assignez-le maintenant à un véhicule de votre flotte.`,
      driver: { id: driver.id, full_name: driver.full_name, phone: driver.phone }
    };
  } catch (err) {
    console.error("[linkDriverToInvestor]", err);
    return { ok: false, message: "Liaison impossible. Vérifiez la connexion Supabase." };
  }
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

  if (driverId) {
    await syncAssignedDriverProfile(supabase, driverId);
  }

  revalidateFleetAssignmentViews();
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

    await syncAssignedDriverProfile(supabase, driver.id);
    revalidateFleetAssignmentViews();

    return { ok: true, message: `${driver.full_name ?? parsed.data.full_name} est associe a ${ownedVehicle.label}.` };
  } catch (error) {
    console.error("[registerOrAssignDriverByPhone]", error);
    return {
      ok: false,
      message: "Association impossible. Verifiez la configuration Supabase et la migration vehicles.driver_id."
    };
  }
}

// ─── Types & actions pour l'assignation rapide depuis InvestorDriverTeamPanel ──

export type AvailableVehicle = {
  id: string;
  label: string;
  plate_number: string;
  type: "taxi" | "moto";
  status: string;
};

export type QuickAssignActionState = {
  ok: boolean;
  message: string;
};

/**
 * Assigne rapidement un chauffeur (déjà identifié par linkDriverToInvestor)
 * à l'un des véhicules disponibles (driver_id IS NULL) de l'investisseur.
 * Met aussi à jour le profil du chauffeur avec l'investor_id en remarque (via
 * la colonne investor_id si elle existe, sinon ignore silencieusement).
 */
export async function assignFoundDriverToVehicle(
  _prev: QuickAssignActionState,
  formData: FormData
): Promise<QuickAssignActionState> {
  // ─── DEBUG : log immédiat avant tout traitement ───────────────────────────
  const driverIdRaw = String(formData.get("driver_id") ?? "").trim();
  const vehicleIdRaw = String(formData.get("vehicle_id") ?? "").trim();
  console.log("Assignation de :", driverIdRaw);
  console.log("[assignFoundDriverToVehicle] driver_id reçu :", JSON.stringify(driverIdRaw), "| vehicle_id reçu :", JSON.stringify(vehicleIdRaw));

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }


    const uuidSchema = z.string().uuid();
    const driverParsed = uuidSchema.safeParse(driverIdRaw);
    const vehicleParsed = uuidSchema.safeParse(vehicleIdRaw);

    if (!driverParsed.success) {
      return {
        ok: false,
        message: `Identifiant chauffeur invalide (reçu: "${driverIdRaw.slice(0, 40)}").`
      };
    }
    if (!vehicleParsed.success) {
      return {
        ok: false,
        message: `Identifiant véhicule invalide (reçu: "${vehicleIdRaw.slice(0, 40)}").`
      };
    }

    const driverId = driverParsed.data;
    const vehicleId = vehicleParsed.data;

    // Sécurité : vérifier que le véhicule appartient bien à l'utilisateur connecté.
    // Cela couvre les investisseurs (role=investor) ET les chauffeurs-patrons qui
    // gèrent leur propre véhicule (owner_id = user.id).
    const { data: vehicle, error: vehicleErr } = await supabase
      .from("vehicles")
      .select("id,label,driver_id")
      .eq("id", vehicleId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (vehicleErr) {
      console.error("[assignFoundDriverToVehicle] vehicle lookup error:", vehicleErr.message);
      return { ok: false, message: `Erreur base de données : ${vehicleErr.message}` };
    }

    if (!vehicle) {
      return { ok: false, message: "Véhicule introuvable ou accès refusé. Vérifiez que ce véhicule vous appartient." };
    }

    if (vehicle.driver_id !== null && vehicle.driver_id !== driverId) {
      return {
        ok: false,
        message: `Le véhicule « ${vehicle.label} » est déjà assigné à un autre chauffeur. Libérez-le d'abord.`
      };
    }

    // Libérer tout autre véhicule de ce chauffeur chez cet investisseur
    await supabase
      .from("vehicles")
      .update({ driver_id: null })
      .eq("owner_id", user.id)
      .eq("driver_id", driverId)
      .neq("id", vehicleId);

    // Assigner le chauffeur au véhicule cible
    const { error: updateErr } = await supabase
      .from("vehicles")
      .update({ driver_id: driverId })
      .eq("id", vehicleId)
      .eq("owner_id", user.id);

    if (updateErr) {
      console.error("[assignFoundDriverToVehicle] update error:", updateErr.message);
      return { ok: false, message: updateErr.message };
    }

    await syncAssignedDriverProfile(supabase, driverId);
    revalidateFleetAssignmentViews();

    return { ok: true, message: `Chauffeur assigné au véhicule « ${vehicle.label} » avec succès !` };
  } catch (err) {
    console.error("[assignFoundDriverToVehicle]", err);
    return { ok: false, message: "Assignation impossible. Vérifiez la connexion Supabase." };
  }
}
