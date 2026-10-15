import "server-only";

import { getUsdToCdfRate, usdToCdf } from "@/lib/fx/rate";
import { createServiceClient } from "@/lib/supabase/admin";
import type { MobileMoneyStatus } from "@/lib/supabase/types";
import { todayInAppTimezone } from "@/lib/time/kinshasa";
import { getDeposit } from "./pawapay";

export type FinalizeResult = { status: MobileMoneyStatus; message: string };

const FINAL_STATUSES: MobileMoneyStatus[] = ["completed", "failed", "rejected"];

/**
 * Met à jour une transaction d'après pawaPay (jamais d'après le navigateur ni le
 * corps du callback) et crée le versement validé quand l'argent est reçu.
 * Idempotent : le callback et le suivi côté chauffeur peuvent l'appeler en même temps.
 */
export async function finalizeMobileMoneyTransaction(transactionId: string): Promise<FinalizeResult | null> {
  const service = createServiceClient();
  if (!service) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  }

  const { data: transaction, error } = await service
    .from("mobile_money_transactions")
    .select("id,driver_id,vehicle_id,investor_id,amount,currency,status")
    .eq("id", transactionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!transaction) {
    return null;
  }

  if (FINAL_STATUSES.includes(transaction.status)) {
    return { status: transaction.status, message: messageFor(transaction.status) };
  }

  const deposit = await getDeposit(transactionId);
  if (!deposit.found) {
    return { status: transaction.status, message: messageFor(transaction.status) };
  }

  if (deposit.status === "FAILED") {
    await service
      .from("mobile_money_transactions")
      .update({ status: "failed", failure_reason: deposit.failureReason, updated_at: new Date().toISOString() })
      .eq("id", transactionId)
      .not("status", "in", "(completed,failed,rejected)");
    return { status: "failed", message: messageFor("failed", deposit.failureReason) };
  }

  if (deposit.status !== "COMPLETED") {
    return { status: "accepted", message: messageFor("accepted") };
  }

  // Une seule exécution « gagne » le passage à completed et crée le versement.
  const { data: claimed } = await service
    .from("mobile_money_transactions")
    .update({
      status: "completed",
      provider_transaction_id: deposit.providerTransactionId,
      updated_at: new Date().toISOString()
    })
    .eq("id", transactionId)
    .not("status", "in", "(completed,failed,rejected)")
    .select("id");

  if (!claimed?.length) {
    return { status: "completed", message: messageFor("completed") };
  }

  const amount = Number(transaction.amount);
  const amountCdf = transaction.currency === "USD" ? usdToCdf(amount, (await getUsdToCdfRate()).rate) : amount;
  const now = new Date().toISOString();

  const { data: payment, error: paymentError } = await service
    .from("payments")
    .insert({
      amount: amountCdf,
      driver_id: transaction.driver_id,
      vehicle_id: transaction.vehicle_id,
      investor_id: transaction.investor_id,
      // L'argent est réellement arrivé : pas besoin de validation manuelle.
      status: "validated",
      source: "mobile_money",
      session_type: "driver_revenue",
      payment_date: todayInAppTimezone(),
      comment: [
        "Mobile Money",
        transaction.currency === "USD" ? `${amount} USD` : null,
        `réf. ${deposit.providerTransactionId ?? transactionId}`
      ]
        .filter(Boolean)
        .join(" · "),
      validated_at: now
    })
    .select("id")
    .single();

  if (paymentError) {
    console.error("[finalizeMobileMoneyTransaction] versement non créé :", paymentError.message);
  } else {
    await service.from("mobile_money_transactions").update({ payment_id: payment.id }).eq("id", transactionId);
  }

  return { status: "completed", message: messageFor("completed") };
}

export function messageFor(status: MobileMoneyStatus, reason?: string | null): string {
  switch (status) {
    case "completed":
      return "Paiement reçu. Votre versement est enregistré et validé.";
    case "failed":
      return `Paiement échoué${reason ? ` : ${reason}` : ""}. Aucun argent n'a été prélevé.`;
    case "rejected":
      return `Paiement refusé${reason ? ` : ${reason}` : ""}.`;
    default:
      return "Confirmez le paiement sur votre téléphone avec votre code PIN Mobile Money.";
  }
}
