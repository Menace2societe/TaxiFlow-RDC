"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  driverLoginEmail,
  formatAccessCode,
  generateAccessCode,
  normalizeDrcPhone
} from "@/lib/auth/driver-access";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

const assignVehicleSchema = z.object({
  vehicle_id: z.string().uuid()
});

const driverPhoneAssignmentSchema = z.object({
  vehicle_id: z.string().uuid(),
  full_name: z.string().min(2, "Le nom du chauffeur est obligatoire.").max(120).transform((value) => value.trim()),
  phone: z
    .string()
    .transform((value) => normalizeDrcPhone(value) ?? "")
    .refine((value) => value !== "", "Le telephone doit etre un numero RDC : +243 suivi de 9 chiffres."),
  confirm_reassign: z.coerce.boolean().default(false)
});

export type DriverAssignmentActionState = {
  ok: boolean;
  message: string;
  /** Code d'accès à transmettre au chauffeur (affiché une seule fois). */
  accessCode?: string;
};

export type LinkDriverActionState = {
  ok: boolean;
  message: string;
  driver?: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
  /** Code d'accès à transmettre au chauffeur (affiché une seule fois). */
  accessCode?: string;
};

type FoundDriver = { id: string; full_name: string | null; phone: string | null; role: string };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const missingServiceRoleMessage =
  "Aucun chauffeur avec ce telephone. Configurez SUPABASE_SERVICE_ROLE_KEY pour inscrire un nouveau chauffeur.";

/** Investisseur, admin ou chauffeur-patron : les seuls autorisés à recruter un chauffeur. */
async function canManageDrivers(supabase: SupabaseServerClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role,is_owner_driver")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data && (data.role === "investor" || data.role === "admin" || data.is_owner_driver));
}

async function findDriverByPhone(supabase: SupabaseServerClient, phone: string): Promise<FoundDriver | null> {
  const { data, error } = await supabase.rpc("find_driver_by_phone", { p_phone: phone });
  if (error) {
    throw new Error(error.message);
  }
  return data?.[0] ?? null;
}

/**
 * Crée un compte chauffeur connectable sans SMS : identifiant technique dérivé
 * du numéro + code d'accès. Le chauffeur se connecte avec « numéro + code ».
 */
async function createPhoneDriverAccount(
  phone: string,
  fullName: string
): Promise<{ ok: true; driver: FoundDriver; accessCode: string } | { ok: false; message: string }> {
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return { ok: false, message: missingServiceRoleMessage };
  }

  const accessCode = generateAccessCode();
  const { data, error } = await serviceClient.auth.admin.createUser({
    email: driverLoginEmail(phone),
    email_confirm: true,
    phone,
    phone_confirm: true,
    password: accessCode,
    user_metadata: { full_name: fullName, phone, role: "driver" }
  });

  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "Creation du compte chauffeur impossible." };
  }

  // Le trigger handle_new_user crée le profil chauffeur.
  return {
    ok: true,
    driver: { id: data.user.id, full_name: fullName, phone, role: "driver" },
    accessCode
  };
}

function revalidateFleetAssignmentViews() {
  revalidatePath(ROUTES.INVESTOR_FLEET, "layout");
  revalidatePath(ROUTES.INVESTOR_DASHBOARD, "layout");
  revalidatePath(ROUTES.DRIVER_PORTAL, "layout");
  revalidatePath(ROUTES.DRIVER_DASHBOARD, "layout");
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

    if (!(await canManageDrivers(supabase, user.id))) {
      return { ok: false, message: "Seuls les investisseurs et chauffeurs-patrons peuvent recruter un chauffeur." };
    }

    const rawIdentifier = String(formData.get("identifier") ?? "").trim();
    const fullName = String(formData.get("full_name") ?? "").trim();

    if (!rawIdentifier) {
      return { ok: false, message: "Renseignez le numéro de téléphone du chauffeur." };
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawIdentifier);
    const normalizedPhone = isUUID ? null : normalizeDrcPhone(rawIdentifier);

    if (!isUUID && !normalizedPhone) {
      return {
        ok: false,
        message: "Format invalide. Utilisez un numéro RDC : +243 81 234 5678 ou 081 234 5678."
      };
    }

    let driver: FoundDriver | null = null;
    let accessCode: string | undefined;

    if (isUUID) {
      // Par UUID, seuls les chauffeurs déjà visibles (déjà dans votre équipe) sont trouvés.
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,phone,role")
        .eq("id", rawIdentifier)
        .maybeSingle();
      driver = data;
      if (!driver) {
        return { ok: false, message: "Aucun chauffeur trouvé. Recherchez-le par son numéro de téléphone." };
      }
    } else {
      driver = await findDriverByPhone(supabase, normalizedPhone!);
    }

    if (!driver) {
      if (!fullName || fullName.length < 2) {
        return { ok: false, message: "Nouveau numéro : indiquez le nom complet pour créer le compte chauffeur." };
      }

      const created = await createPhoneDriverAccount(normalizedPhone!, fullName);
      if (!created.ok) {
        return { ok: false, message: created.message };
      }
      driver = created.driver;
      accessCode = created.accessCode;
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
      message: accessCode
        ? `Compte créé pour ${driver.full_name}. Donnez-lui son numéro et ce code pour se connecter : ${formatAccessCode(accessCode)}. Assignez-le maintenant à un véhicule.`
        : `${driver.full_name ?? rawIdentifier} a été trouvé. Assignez-le maintenant à un véhicule de votre flotte.`,
      driver: { id: driver.id, full_name: driver.full_name, phone: driver.phone },
      accessCode
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

    let driver = await findDriverByPhone(supabase, parsed.data.phone);
    let accessCode: string | undefined;

    if (!driver) {
      const created = await createPhoneDriverAccount(parsed.data.phone, parsed.data.full_name);
      if (!created.ok) {
        return { ok: false, message: created.message };
      }
      driver = created.driver;
      accessCode = created.accessCode;
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

    revalidateFleetAssignmentViews();

    const name = driver.full_name ?? parsed.data.full_name;
    return {
      ok: true,
      message: accessCode
        ? `${name} est associe a ${ownedVehicle.label}. Code de connexion a lui transmettre : ${formatAccessCode(accessCode)} (avec son numero).`
        : `${name} est associe a ${ownedVehicle.label}.`,
      accessCode
    };
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
  const driverIdRaw = String(formData.get("driver_id") ?? "").trim();
  const vehicleIdRaw = String(formData.get("vehicle_id") ?? "").trim();

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

    revalidateFleetAssignmentViews();

    return { ok: true, message: `Chauffeur assigné au véhicule « ${vehicle.label} » avec succès !` };
  } catch (err) {
    console.error("[assignFoundDriverToVehicle]", err);
    return { ok: false, message: "Assignation impossible. Vérifiez la connexion Supabase." };
  }
}

// ─── Code d'accès des chauffeurs inscrits par téléphone ─────────────────────

export type ResetAccessCodeState = {
  ok: boolean;
  message: string;
  accessCode?: string;
};

/**
 * Génère un nouveau code d'accès pour un chauffeur de l'équipe (code oublié,
 * ou chauffeur créé avant que la connexion par téléphone existe).
 * Refusé pour les chauffeurs inscrits avec leur propre email.
 */
export async function resetDriverAccessCode(
  _prev: ResetAccessCodeState,
  formData: FormData
): Promise<ResetAccessCodeState> {
  try {
    const driverId = z.string().uuid().safeParse(formData.get("driver_id"));
    if (!driverId.success) {
      return { ok: false, message: "Chauffeur invalide." };
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    // Seul l'investisseur qui emploie ce chauffeur peut lui redonner un code.
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", user.id)
      .eq("driver_id", driverId.data)
      .limit(1)
      .maybeSingle();

    if (!vehicle) {
      return { ok: false, message: "Ce chauffeur n'est affecté à aucun de vos véhicules." };
    }

    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return { ok: false, message: "Configurez SUPABASE_SERVICE_ROLE_KEY pour gérer les codes d'accès." };
    }

    const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(driverId.data);
    if (authError || !authUser.user) {
      return { ok: false, message: authError?.message ?? "Compte chauffeur introuvable." };
    }

    const phone = normalizeDrcPhone(authUser.user.phone || (authUser.user.user_metadata?.phone as string | undefined));
    if (!phone) {
      return { ok: false, message: "Ce chauffeur n'a pas de numéro RDC valide." };
    }

    const loginEmail = driverLoginEmail(phone);
    const currentEmail = authUser.user.email ?? "";
    if (currentEmail && currentEmail !== loginEmail) {
      return {
        ok: false,
        message: "Ce chauffeur se connecte avec son propre email : il peut utiliser « mot de passe oublié »."
      };
    }

    const accessCode = generateAccessCode();
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(driverId.data, {
      email: loginEmail,
      email_confirm: true,
      password: accessCode
    });

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    return {
      ok: true,
      message: `Nouveau code : ${formatAccessCode(accessCode)}. Le chauffeur se connecte avec ${phone} et ce code.`,
      accessCode
    };
  } catch (err) {
    console.error("[resetDriverAccessCode]", err);
    return { ok: false, message: "Impossible de générer un code. Vérifiez la connexion Supabase." };
  }
}
