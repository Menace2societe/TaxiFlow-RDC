"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { finalizeSubscriptionPayment, subscriptionMessage } from "@/lib/billing/finalize";
import { BILLING_PERIODS, periodPriceUsd } from "@/lib/billing/plans";
import { getOwnerBilling } from "@/lib/billing/subscription";
import { getUsdToCdfRate, usdToCdf } from "@/lib/fx/rate";
import { MOBILE_MONEY_PROVIDERS, formatPawapayAmount, providerLabels, toPawapayMsisdn } from "@/lib/mobile-money/operators";
import { initiateDeposit, isPawapayConfigured } from "@/lib/mobile-money/pawapay";
import { ROUTES } from "@/lib/routes";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MobileMoneyStatus } from "@/lib/supabase/types";

export type BillingPaymentState = {
  ok: boolean;
  message: string;
  transactionId?: string;
  status?: MobileMoneyStatus;
};

const paymentSchema = z.object({
  months: z.coerce.number().refine((value) => BILLING_PERIODS.some((period) => period.months === value), "Durée invalide."),
  currency: z.enum(["CDF", "USD"]),
  provider: z.enum(MOBILE_MONEY_PROVIDERS),
  phone: z.string().min(9, "Numéro invalide.")
});

/**
 * Le montant est recalculé côté serveur à partir de la flotte réelle :
 * le navigateur n'envoie que la durée, l'opérateur et le numéro.
 */
export async function startSubscriptionPayment(_prev: BillingPaymentState, formData: FormData): Promise<BillingPaymentState> {
  if (!isPawapayConfigured()) {
    return { ok: false, message: "Le paiement Mobile Money n'est pas encore activé. Contactez TaxiFlow pour payer en espèces." };
  }

  const parsed = paymentSchema.safeParse({
    months: formData.get("months"),
    currency: formData.get("currency"),
    provider: formData.get("provider"),
    phone: formData.get("phone")
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée. Reconnectez-vous." };

  const billing = await getOwnerBilling(supabase, user.id);
  if (!billing) return { ok: false, message: "Abonnement indisponible pour le moment." };
  if (billing.quote.totalUsd <= 0) {
    return { ok: false, message: "Votre flotte actuelle est gratuite : aucun paiement nécessaire." };
  }

  const { months, currency, provider, phone } = parsed.data;
  const priceUsd = periodPriceUsd(billing.quote.totalUsd, months);
  const amount = currency === "USD" ? priceUsd : usdToCdf(priceUsd, (await getUsdToCdfRate()).rate);
  const formattedAmount = formatPawapayAmount(amount, currency, provider);
  const msisdn = toPawapayMsisdn(phone);
  if (!msisdn) return { ok: false, message: "Numéro RDC invalide (ex. 081 234 5678)." };
  if (!formattedAmount) return { ok: false, message: "Montant invalide." };

  const service = createServiceClient();
  if (!service) return { ok: false, message: "Configuration serveur incomplète (service role)." };

  const transactionId = crypto.randomUUID();
  const { error: insertError } = await service.from("subscription_payments").insert({
    id: transactionId,
    owner_id: user.id,
    months,
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
    clientReferenceId: `abonnement-${user.id}`.slice(0, 64)
  });

  const status: MobileMoneyStatus = result.ok ? "accepted" : "rejected";
  await service
    .from("subscription_payments")
    .update({ status, failure_reason: result.ok ? null : result.reason, updated_at: new Date().toISOString() })
    .eq("id", transactionId);

  if (!result.ok) {
    return { ok: false, status, transactionId, message: subscriptionMessage("rejected", result.reason) };
  }

  return {
    ok: true,
    status,
    transactionId,
    message: `Demande de ${formattedAmount} ${currency} envoyée sur ${providerLabels[provider]}. ${subscriptionMessage("accepted")}`
  };
}

export async function refreshSubscriptionPayment(transactionId: string): Promise<BillingPaymentState> {
  if (!z.string().uuid().safeParse(transactionId).success) return { ok: false, message: "Paiement invalide." };

  const supabase = await createClient();
  // RLS : chacun ne voit que ses paiements.
  const { data } = await supabase.from("subscription_payments").select("id").eq("id", transactionId).maybeSingle();
  if (!data) return { ok: false, message: "Paiement introuvable." };

  try {
    const result = await finalizeSubscriptionPayment(transactionId);
    if (!result) return { ok: false, message: "Paiement introuvable." };
    if (result.status === "completed") revalidatePath(ROUTES.INVESTOR_BILLING);
    return { ok: result.status !== "failed" && result.status !== "rejected", transactionId, ...result };
  } catch (error) {
    console.error("[refreshSubscriptionPayment]", error);
    return { ok: true, status: "accepted", transactionId, message: "Vérification en cours… réessayez dans un instant." };
  }
}

export type CashPaymentState = { ok: boolean; message: string };

const cashSchema = z.object({
  owner_id: z.string().uuid(),
  months: z.coerce.number().int().min(1).max(12),
  amount: z.coerce.number().positive("Montant encaissé invalide."),
  currency: z.enum(["CDF", "USD"])
});

/** Admin : enregistre un abonnement payé en espèces. */
export async function recordCashSubscription(_prev: CashPaymentState, formData: FormData): Promise<CashPaymentState> {
  const parsed = cashSchema.safeParse({
    owner_id: formData.get("owner_id"),
    months: formData.get("months"),
    amount: formData.get("amount"),
    currency: formData.get("currency")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Données invalides." };

  const supabase = await createClient();
  const { data: paidUntil, error } = await supabase.rpc("admin_extend_subscription", {
    p_owner_id: parsed.data.owner_id,
    p_months: parsed.data.months,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency
  });

  if (error) {
    return { ok: false, message: error.message.includes("not_authorized") ? "Réservé aux administrateurs." : error.message };
  }

  revalidatePath(ROUTES.DASHBOARD_USERS);
  return { ok: true, message: `Abonnement actif jusqu'au ${paidUntil}.` };
}
