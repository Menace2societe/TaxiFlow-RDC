import "server-only";

import { getDeposit } from "@/lib/mobile-money/pawapay";
import { createServiceClient } from "@/lib/supabase/admin";
import type { MobileMoneyStatus } from "@/lib/supabase/types";

export type SubscriptionFinalizeResult = { status: MobileMoneyStatus; message: string };

const FINAL_STATUSES: MobileMoneyStatus[] = ["completed", "failed", "rejected"];

export function subscriptionMessage(status: MobileMoneyStatus, reason?: string | null, paidUntil?: string | null): string {
  switch (status) {
    case "completed":
      return paidUntil ? `Paiement reçu. Abonnement actif jusqu'au ${paidUntil}.` : "Paiement reçu. Abonnement prolongé.";
    case "failed":
      return `Paiement échoué${reason ? ` : ${reason}` : ""}. Aucun argent n'a été prélevé.`;
    case "rejected":
      return `Paiement refusé${reason ? ` : ${reason}` : ""}.`;
    default:
      return "Confirmez le paiement sur votre téléphone avec votre code PIN Mobile Money.";
  }
}

/**
 * Comme pour les versements : statut relu chez pawaPay, une seule exécution
 * prolonge l'abonnement. Retourne null si le paiement n'existe pas.
 */
export async function finalizeSubscriptionPayment(paymentId: string): Promise<SubscriptionFinalizeResult | null> {
  const service = createServiceClient();
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");

  const { data: payment, error } = await service
    .from("subscription_payments")
    .select("id,owner_id,months,status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payment) return null;
  if (FINAL_STATUSES.includes(payment.status)) {
    return { status: payment.status, message: subscriptionMessage(payment.status) };
  }

  const deposit = await getDeposit(paymentId);
  if (!deposit.found) return { status: payment.status, message: subscriptionMessage(payment.status) };

  if (deposit.status === "FAILED") {
    await service
      .from("subscription_payments")
      .update({ status: "failed", failure_reason: deposit.failureReason, updated_at: new Date().toISOString() })
      .eq("id", paymentId)
      .not("status", "in", "(completed,failed,rejected)");
    return { status: "failed", message: subscriptionMessage("failed", deposit.failureReason) };
  }

  if (deposit.status !== "COMPLETED") {
    return { status: "accepted", message: subscriptionMessage("accepted") };
  }

  const { data: claimed } = await service
    .from("subscription_payments")
    .update({
      status: "completed",
      provider_transaction_id: deposit.providerTransactionId,
      updated_at: new Date().toISOString()
    })
    .eq("id", paymentId)
    .not("status", "in", "(completed,failed,rejected)")
    .select("id");

  if (!claimed?.length) return { status: "completed", message: subscriptionMessage("completed") };

  const { data: paidUntil, error: extendError } = await service.rpc("extend_subscription", {
    p_owner_id: payment.owner_id,
    p_months: payment.months
  });
  if (extendError) {
    // Argent reçu mais prolongation ratée : visible dans les logs pour correction manuelle.
    console.error("[finalizeSubscriptionPayment] prolongation impossible :", paymentId, extendError.message);
  }

  return { status: "completed", message: subscriptionMessage("completed", null, paidUntil) };
}
