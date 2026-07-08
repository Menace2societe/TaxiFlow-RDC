"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

export type PaymentActionResult = {
  ok: boolean;
  message: string;
};

function revalidatePaymentViews() {
  // Utiliser 'layout' pour forcer une invalidation profonde du cache RSC.
  // Sans ce segment, Next.js peut servir le payload en cache même après
  // une écriture en base de données — rendant les versements invisibles côté investisseur.
  revalidatePath(ROUTES.DASHBOARD_OVERVIEW, "layout");
  revalidatePath(ROUTES.INVESTOR_DASHBOARD, "layout");
  revalidatePath(ROUTES.DRIVER_DASHBOARD, "layout");
  revalidatePath(ROUTES.DRIVER_PORTAL, "layout");
}

export async function recordPayment(
  amount: number,
  driverId: string,
  vehicleId: string,
  investorId: string,
  /** Passer true si chauffeur-patron : auto-approuve le versement */
  isOwnerDriver = false
): Promise<PaymentActionResult> {
  try {
    const normalizedAmount = Number(amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return { ok: false, message: "Montant de versement invalide." };
    }

    if (!driverId || !vehicleId || !investorId) {
      return { ok: false, message: "Chauffeur, vehicule ou investisseur manquant." };
    }

    // Règle métier : chauffeur-patron = pas d'investisseur tiers → statut approuvé d'emblée.
    const status = isOwnerDriver ? "approved" : "pending";

    const supabase = await createClient();
    const { error } = await supabase.from("payments").insert({
      amount: normalizedAmount,
      driver_id: driverId,
      vehicle_id: vehicleId,
      investor_id: investorId,
      status
    });

    if (error) {
      console.error("[recordPayment] Supabase insert failed:", error.message);
      return { ok: false, message: error.message };
    }

    revalidatePaymentViews();
    return {
      ok: true,
      message: isOwnerDriver
        ? "Versement enregistré et approuvé automatiquement."
        : "Versement declare et en attente de validation."
    };
  } catch (error) {
    console.error("[recordPayment] Unexpected failure:", error);
    return {
      ok: false,
      message: "Impossible d'enregistrer le versement. Verifiez la connexion Supabase."
    };
  }
}

export async function recordDriverPayment(formData: FormData) {
  const returnPath = String(formData.get("return_path") ?? ROUTES.DRIVER_DASHBOARD);
  const amount = Number(formData.get("amount")) || 0;

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(loginWithNext(returnPath));
    }

    // Récupérer le véhicule assigné au chauffeur + son propriétaire (investor_id)
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id,owner_id")
      .eq("driver_id", user.id)
      .maybeSingle();

    if (vehicleError) {
      console.error("[recordDriverPayment] Erreur récupération véhicule :", vehicleError.message);
      redirect(`${returnPath}?error=${encodeURIComponent(vehicleError.message ?? "Erreur récupération véhicule.")}`);
    }

    if (!vehicle) {
      redirect(`${returnPath}?error=${encodeURIComponent("Aucun véhicule assigné. Contactez votre investisseur.")}`);
    }

    // Sécurité critique : owner_id est l'investor_id qui recevra le versement.
    // Sans lui, le paiement ne serait visible par aucun investisseur.
    const investorId = vehicle.owner_id;
    if (!investorId) {
      console.error("[recordDriverPayment] owner_id manquant sur le véhicule :", vehicle.id);
      redirect(`${returnPath}?error=${encodeURIComponent("Véhicule sans propriétaire. Contactez le support.")}`);
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      redirect(`${returnPath}?error=${encodeURIComponent("Montant de versement invalide.")}`);
    }

    // Chauffeur-patron : owner_id === driver_id → versement auto-approuvé
    const isOwnerDriver = investorId === user.id;

    console.log("[recordDriverPayment] Insertion versement — driver:", user.id, "| vehicle:", vehicle.id, "| investor_id:", investorId, "| isOwnerDriver:", isOwnerDriver, "| montant:", normalizedAmount);

    const result = await recordPayment(normalizedAmount, user.id, vehicle.id, investorId, isOwnerDriver);

    if (!result.ok) {
      console.error("[recordDriverPayment] recordPayment a échoué :", result.message);
      redirect(`${returnPath}?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`${returnPath}?payment=1`);
  } catch (error) {
    const isRedirect =
      error != null &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");

    if (isRedirect) {
      throw error;
    }

    console.error("[recordDriverPayment] Unexpected failure:", error);
    redirect(`${returnPath}?error=${encodeURIComponent("Versement impossible. Reessayez dans un instant.")}`);
  }
}

// ─── Mise à jour du statut de versement (chauffeur-patron uniquement) ─────────

const updatePaymentStatusSchema = z.object({
  payment_id: z.string().uuid(),
  new_status: z.enum(["pending", "approved", "rejected"])
});

export type UpdatePaymentStatusState = {
  ok: boolean;
  message: string;
};

/**
 * Permet à un chauffeur-patron (owner_id === driver_id) de modifier le statut
 * de ses propres versements. Sécurité : le payment doit appartenir à l'utilisateur
 * connecté (driver_id = user.id ET vehicle.owner_id = user.id).
 */
export async function updatePaymentStatus(
  _prev: UpdatePaymentStatusState,
  formData: FormData
): Promise<UpdatePaymentStatusState> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    const parsed = updatePaymentStatusSchema.safeParse({
      payment_id: formData.get("payment_id"),
      new_status: formData.get("new_status")
    });

    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Données invalides.";
      return { ok: false, message: first };
    }

    const { payment_id, new_status } = parsed.data;

    // Récupérer le versement — vérifier que c'est bien celui du chauffeur connecté
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("id, driver_id, vehicle_id, status")
      .eq("id", payment_id)
      .eq("driver_id", user.id)
      .maybeSingle();

    if (payErr || !payment) {
      return { ok: false, message: "Versement introuvable ou accès refusé." };
    }

    // Double vérification : le véhicule doit avoir owner_id = user.id (chauffeur-patron)
    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id, owner_id")
      .eq("id", payment.vehicle_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (vErr || !vehicle) {
      return {
        ok: false,
        message: "Accès refusé. Seul le chauffeur-patron peut modifier ses versements."
      };
    }

    // Mettre à jour le statut
    const { error: updateErr } = await supabase
      .from("payments")
      .update({ status: new_status })
      .eq("id", payment_id)
      .eq("driver_id", user.id);

    if (updateErr) {
      console.error("[updatePaymentStatus] update error:", updateErr.message);
      return { ok: false, message: updateErr.message };
    }

    revalidatePaymentViews();

    const labels: Record<string, string> = {
      pending: "En attente",
      approved: "Approuvé",
      rejected: "Rejeté"
    };

    return { ok: true, message: `Versement marqué comme : ${labels[new_status] ?? new_status}.` };
  } catch (err) {
    console.error("[updatePaymentStatus]", err);
    return { ok: false, message: "Mise à jour impossible. Vérifiez la connexion." };
  }
}
