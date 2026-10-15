"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { finalizeMobileMoneyTransaction, messageFor } from "@/lib/mobile-money/finalize";
import {
  MOBILE_MONEY_PROVIDERS,
  formatPawapayAmount,
  providerLabels,
  toPawapayMsisdn
} from "@/lib/mobile-money/operators";
import { initiateDeposit, isPawapayConfigured } from "@/lib/mobile-money/pawapay";
import { ROUTES } from "@/lib/routes";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MobileMoneyStatus } from "@/lib/supabase/types";

export type MobileMoneyState = {
  ok: boolean;
  message: string;
  transactionId?: string;
  status?: MobileMoneyStatus;
};

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Montant invalide."),
  currency: z.enum(["CDF", "USD"]),
  provider: z.enum(MOBILE_MONEY_PROVIDERS),
  phone: z.string().min(9, "Numéro invalide.")
});

function revalidatePaymentViews() {
  revalidatePath(ROUTES.DRIVER_PORTAL, "layout");
  revalidatePath(ROUTES.INVESTOR_REVENUE, "layout");
  revalidatePath(ROUTES.INVESTOR_DASHBOARD, "layout");
}

/** Le chauffeur paie son versement : pawaPay envoie la demande de PIN sur son téléphone. */
export async function startMobileMoneyPayment(_prev: MobileMoneyState, formData: FormData): Promise<MobileMoneyState> {
  if (!isPawapayConfigured()) {
    return { ok: false, message: "Le paiement Mobile Money n'est pas encore activé par votre investisseur." };
  }

  const parsed = paymentSchema.safeParse({
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    provider: formData.get("provider"),
    phone: formData.get("phone")
  });
  if (!parsed.success) {
    return { ok: false, message: Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Données invalides." };
  }

  const { amount, currency, provider, phone } = parsed.data;
  const msisdn = toPawapayMsisdn(phone);
  const formattedAmount = formatPawapayAmount(amount, currency, provider);
  if (!msisdn) return { ok: false, message: "Numéro RDC invalide (ex. 081 234 5678)." };
  if (!formattedAmount) return { ok: false, message: "Montant invalide." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée. Reconnectez-vous." };

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id,owner_id")
    .eq("driver_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!vehicle) return { ok: false, message: "Aucun véhicule assigné. Contactez votre investisseur." };

  const service = createServiceClient();
  if (!service) return { ok: false, message: "Configuration serveur incomplète (service role)." };

  const transactionId = crypto.randomUUID();
  const { error: insertError } = await service.from("mobile_money_transactions").insert({
    id: transactionId,
    driver_id: user.id,
    vehicle_id: vehicle.id,
    investor_id: vehicle.owner_id,
    amount: Number(formattedAmount),
    currency,
    provider,
    phone: msisdn
  });
  if (insertError) return { ok: false, message: insertError.message };

  const result = await initiateDeposit({
    depositId: transactionId,
    msisdn,
    provider,
    amount: formattedAmount,
    currency,
    clientReferenceId: vehicle.id
  });

  if (!result.ok) {
    await service
      .from("mobile_money_transactions")
      .update({ status: "rejected", failure_reason: result.reason, updated_at: new Date().toISOString() })
      .eq("id", transactionId);
    return { ok: false, status: "rejected", transactionId, message: messageFor("rejected", result.reason) };
  }

  await service
    .from("mobile_money_transactions")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", transactionId);

  return {
    ok: true,
    status: "accepted",
    transactionId,
    message: `Demande envoyée sur ${providerLabels[provider]}. ${messageFor("accepted")}`
  };
}

/** Suivi côté chauffeur, en plus du callback pawaPay. */
export async function refreshMobileMoneyPayment(transactionId: string): Promise<MobileMoneyState> {
  if (!z.string().uuid().safeParse(transactionId).success) {
    return { ok: false, message: "Transaction invalide." };
  }

  const supabase = await createClient();
  // RLS : le chauffeur ne voit que ses propres transactions.
  const { data: transaction } = await supabase
    .from("mobile_money_transactions")
    .select("id")
    .eq("id", transactionId)
    .maybeSingle();
  if (!transaction) return { ok: false, message: "Transaction introuvable." };

  try {
    const result = await finalizeMobileMoneyTransaction(transactionId);
    if (!result) return { ok: false, message: "Transaction introuvable." };
    if (result.status === "completed") revalidatePaymentViews();
    return { ok: result.status !== "failed" && result.status !== "rejected", transactionId, ...result };
  } catch (error) {
    console.error("[refreshMobileMoneyPayment]", error);
    return { ok: true, status: "accepted", transactionId, message: "Vérification en cours… réessayez dans un instant." };
  }
}
