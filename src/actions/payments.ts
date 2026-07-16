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
  revalidatePath(ROUTES.INVESTOR_REVENUE, "layout");
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
    const status = isOwnerDriver ? "validated" : "pending";

    const supabase = await createClient();
    const { error } = await supabase.from("payments").insert({
      amount: normalizedAmount,
      driver_id: driverId,
      vehicle_id: vehicleId,
      investor_id: investorId,
      status,
      source: "automated",
      session_type: "driver_revenue",
      payment_date: new Date().toISOString().slice(0, 10)
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

// ─── Actions de validation/rejet côté Investisseur ───────────────────────────

/**
 * Permet à l'investisseur connecté d'approuver un versement "pending".
 * Sécurité : le payment.investor_id doit correspondre à l'utilisateur connecté.
 */
export async function approvePayment(paymentId: string): Promise<PaymentActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    if (!paymentId || typeof paymentId !== "string") {
      return { ok: false, message: "Identifiant de versement invalide." };
    }

    // Vérifier que ce versement appartient bien à l'investisseur connecté
    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("id, status")
      .eq("id", paymentId)
      .eq("investor_id", user.id)
      .maybeSingle();

    if (fetchErr || !payment) {
      return { ok: false, message: "Versement introuvable ou accès refusé." };
    }

    const { error: updateErr } = await supabase
      .from("payments")
      .update({
        status: "approved",
        validated_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq("id", paymentId)
      .eq("investor_id", user.id);

    if (updateErr) {
      console.error("[approvePayment] update error:", updateErr.message);
      return { ok: false, message: updateErr.message };
    }

    revalidatePaymentViews();
    return { ok: true, message: "Versement approuvé avec succès." };
  } catch (err) {
    console.error("[approvePayment]", err);
    return { ok: false, message: "Approbation impossible. Vérifiez la connexion." };
  }
}

/**
 * Permet à l'investisseur connecté de rejeter un versement "pending".
 * Sécurité : le payment.investor_id doit correspondre à l'utilisateur connecté.
 */
export async function rejectPayment(
  paymentId: string,
  reason?: string
): Promise<PaymentActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    if (!paymentId || typeof paymentId !== "string") {
      return { ok: false, message: "Identifiant de versement invalide." };
    }

    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("id, status")
      .eq("id", paymentId)
      .eq("investor_id", user.id)
      .maybeSingle();

    if (fetchErr || !payment) {
      return { ok: false, message: "Versement introuvable ou accès refusé." };
    }

    const { error: updateErr } = await supabase
      .from("payments")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: reason ?? null
      })
      .eq("id", paymentId)
      .eq("investor_id", user.id);

    if (updateErr) {
      console.error("[rejectPayment] update error:", updateErr.message);
      return { ok: false, message: updateErr.message };
    }

    revalidatePaymentViews();
    return { ok: true, message: "Versement rejeté." };
  } catch (err) {
    console.error("[rejectPayment]", err);
    return { ok: false, message: "Rejet impossible. Vérifiez la connexion." };
  }
}

// ─── Schéma Zod pour le versement manuel ─────────────────────────────────────

const manualPaymentSchema = z.object({
  driverId: z.string().uuid("Chauffeur invalide."),
  amount: z.coerce
    .number()
    .positive("Le montant doit être positif."),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format YYYY-MM-DD attendu)."),
  notes: z.string().max(500, "Notes trop longues (max 500 caractères).").optional()
});

export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;

/**
 * Enregistre un versement manuel par l'investisseur (ex : paiement en espèces hors ligne).
 * Le versement est directement marqué 'approved' car saisi par le propriétaire lui-même.
 */
export async function recordManualPayment(
  rawData: ManualPaymentInput
): Promise<PaymentActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Session expirée. Reconnectez-vous." };
    }

    // Validation Zod
    const parsed = manualPaymentSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError =
        Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Données invalides.";
      return { ok: false, message: firstError };
    }

    const { driverId, amount, paymentDate, notes } = parsed.data;

    // Récupérer le véhicule du chauffeur qui appartient à cet investisseur
    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id, owner_id")
      .eq("driver_id", driverId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (vErr) {
      console.error("[recordManualPayment] Erreur récupération véhicule:", vErr.message);
      return { ok: false, message: "Impossible de récupérer le véhicule du chauffeur." };
    }

    if (!vehicle) {
      return {
        ok: false,
        message: "Aucun véhicule trouvé pour ce chauffeur dans votre flotte."
      };
    }

    const { error: insertErr } = await supabase.from("payments").insert({
      amount: Number(amount),
      driver_id: driverId,
      vehicle_id: vehicle.id,
      investor_id: user.id,
      status: "approved",
      source: "manual_backup",
      session_type: "driver_revenue",
      payment_date: paymentDate,
      comment: notes ?? null,
      validated_at: new Date().toISOString(),
      reviewed_by: user.id
    });

    if (insertErr) {
      console.error("[recordManualPayment] insert error:", insertErr.message);
      return { ok: false, message: insertErr.message };
    }

    revalidatePaymentViews();
    return { ok: true, message: "Versement manuel enregistré et approuvé." };
  } catch (err) {
    console.error("[recordManualPayment]", err);
    return {
      ok: false,
      message: "Enregistrement impossible. Vérifiez la connexion Supabase."
    };
  }
}

// ─── Mise à jour du statut de versement (chauffeur-patron uniquement) ─────────

const updatePaymentStatusSchema = z.object({
  payment_id: z.string().uuid(),
  new_status: z.enum(["pending", "approved", "validated", "rejected"])
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
