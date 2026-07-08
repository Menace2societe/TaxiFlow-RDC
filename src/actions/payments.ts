"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

export type PaymentActionResult = {
  ok: boolean;
  message: string;
};

function revalidatePaymentViews() {
  revalidatePath(ROUTES.DASHBOARD_OVERVIEW);
  revalidatePath(ROUTES.INVESTOR_DASHBOARD);
  revalidatePath(ROUTES.DRIVER_DASHBOARD);
  revalidatePath(ROUTES.DRIVER_PORTAL);
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

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id,owner_id")
      .eq("driver_id", user.id)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      redirect(`${returnPath}?error=${encodeURIComponent(vehicleError?.message ?? "Aucun vehicule assigne.")}`);
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      redirect(`${returnPath}?error=${encodeURIComponent("Montant de versement invalide.")}`);
    }

    // Règle métier : si owner_id === driver_id, c'est un chauffeur-patron →
    // il n'a pas d'investisseur tiers, le versement est auto-approuvé.
    const isOwnerDriver = vehicle.owner_id === user.id;

    const result = await recordPayment(amount, user.id, vehicle.id, vehicle.owner_id, isOwnerDriver);

    if (!result.ok) {
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
