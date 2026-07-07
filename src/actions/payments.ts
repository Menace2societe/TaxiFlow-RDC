"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

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
  investorId: string
): Promise<PaymentActionResult> {
  try {
    const normalizedAmount = Number(amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return { ok: false, message: "Montant de versement invalide." };
    }

    if (!driverId || !vehicleId || !investorId) {
      return { ok: false, message: "Chauffeur, vehicule ou investisseur manquant." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("payments").insert({
      amount: normalizedAmount,
      driver_id: driverId,
      vehicle_id: vehicleId,
      investor_id: investorId,
      status: "pending"
    });

    if (error) {
      console.error("[recordPayment] Supabase insert failed:", error.message);
      return { ok: false, message: error.message };
    }

    revalidatePaymentViews();
    return { ok: true, message: "Versement declare et en attente de validation." };
  } catch (error) {
    console.error("[recordPayment] Unexpected failure:", error);
    return {
      ok: false,
      message: "Impossible d'enregistrer le versement. Verifiez la connexion Supabase."
    };
  }
}
