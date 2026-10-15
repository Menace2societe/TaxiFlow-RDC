import { redirect } from "next/navigation";
import { CalendarCheck2, CreditCard, Gift } from "lucide-react";
import { SubscriptionPayForm } from "@/components/investor/SubscriptionPayForm";
import { FREE_VEHICLES, PRICE_PER_VEHICLE_USD, TRIAL_DAYS, VOLUME_DISCOUNTS } from "@/lib/billing/plans";
import { getOwnerBilling } from "@/lib/billing/subscription";
import { getCurrentProfile } from "@/lib/auth/roles";
import { getUsdToCdfRate } from "@/lib/fx/rate";
import { isPawapayConfigured } from "@/lib/mobile-money/pawapay";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const statusLabels = {
  trial: "Essai gratuit",
  active: "Abonnement actif",
  expired: "Abonnement expiré"
} as const;

const providerNames: Record<string, string> = {
  VODACOM_MPESA_COD: "M-Pesa",
  AIRTEL_COD: "Airtel Money",
  ORANGE_COD: "Orange Money",
  CASH: "Espèces"
};

const paymentStatusLabels: Record<string, string> = {
  initiated: "Envoyé",
  accepted: "En attente",
  completed: "Payé",
  failed: "Échoué",
  rejected: "Refusé"
};

export default async function InvestorBillingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect(loginWithNext(ROUTES.INVESTOR_BILLING));

  const supabase = await createClient();
  const [billing, rate, { data: payments }] = await Promise.all([
    getOwnerBilling(supabase, profile.id),
    getUsdToCdfRate(),
    supabase
      .from("subscription_payments")
      .select("id,months,amount,currency,provider,status,created_at")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  if (!billing) {
    return <p className="text-sm text-neutral-400">L&apos;abonnement n&apos;est pas encore disponible.</p>;
  }

  const { state, quote } = billing;
  const statusTone =
    state.status === "expired" ? "text-red-300" : state.status === "trial" ? "text-amber-200" : "text-emerald-300";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-300">Espace investisseur</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Abonnement</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
          <CalendarCheck2 size={20} className={statusTone} aria-hidden />
          <p className="mt-3 text-sm text-neutral-400">Statut</p>
          <p className={`mt-1 text-xl font-semibold ${statusTone}`}>{statusLabels[state.status]}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {state.status === "expired"
              ? `Terminé le ${state.accessUntil}`
              : `Jusqu'au ${state.accessUntil} (${state.daysLeft} jour${state.daysLeft > 1 ? "s" : ""})`}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
          <CreditCard size={20} className="text-emerald-300" aria-hidden />
          <p className="mt-3 text-sm text-neutral-400">Votre tarif mensuel</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {quote.totalUsd === 0 ? "Gratuit" : `${quote.totalUsd.toLocaleString("fr-CD")} USD`}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {quote.vehicles} véhicule(s), dont {quote.freeVehicles} offert
            {quote.discountPercent ? ` · remise ${quote.discountPercent} %` : ""}
            {quote.totalUsd > 0 ? ` · ≈ ${Math.round(quote.totalUsd * rate.rate).toLocaleString("fr-CD")} CDF` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
          <Gift size={20} className="text-emerald-300" aria-hidden />
          <p className="mt-3 text-sm text-neutral-400">Grille</p>
          <p className="mt-1 text-sm text-neutral-200">
            {PRICE_PER_VEHICLE_USD.moto} USD / moto · {PRICE_PER_VEHICLE_USD.taxi} USD / taxi par mois
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {FREE_VEHICLES} véhicule offert, {TRIAL_DAYS} jours d&apos;essai,{" "}
            {VOLUME_DISCOUNTS.map((tier) => `-${tier.percent} % dès ${tier.minVehicles}`).join(", ")} véhicules.
          </p>
        </div>
      </section>

      {state.status === "expired" ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Vos données restent consultables, mais vous ne pouvez plus ajouter de véhicule payant tant que
          l&apos;abonnement n&apos;est pas renouvelé.
        </p>
      ) : null}

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Payer par Mobile Money</h2>
        {quote.totalUsd === 0 ? (
          <p className="text-sm text-neutral-400">Avec un seul véhicule, TaxiFlow est gratuit. Rien à payer.</p>
        ) : isPawapayConfigured() ? (
          <SubscriptionPayForm monthlyUsd={quote.totalUsd} usdRate={rate.rate} defaultPhone={profile.phone} />
        ) : (
          <p className="text-sm text-neutral-400">
            Le paiement en ligne arrive bientôt. En attendant, réglez en espèces auprès de l&apos;équipe TaxiFlow :
            votre abonnement sera prolongé immédiatement.
          </p>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          Payer pendant l&apos;essai ne vous fait rien perdre : les mois payés commencent à la fin de l&apos;essai.
        </p>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50">
        <h2 className="border-b border-neutral-800 px-5 py-4 text-base font-semibold text-white">Historique</h2>
        <div className="divide-y divide-neutral-800">
          {(payments ?? []).map((payment) => (
            <p key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span className="text-neutral-300">
                {payment.created_at.slice(0, 10)} · {payment.months} mois · {providerNames[payment.provider] ?? payment.provider}
              </span>
              <span className="font-semibold text-white">
                {Number(payment.amount).toLocaleString("fr-CD")} {payment.currency} ·{" "}
                <span className={payment.status === "completed" ? "text-emerald-300" : "text-neutral-400"}>
                  {paymentStatusLabels[payment.status] ?? payment.status}
                </span>
              </span>
            </p>
          ))}
          {(payments ?? []).length === 0 ? <p className="px-5 py-6 text-sm text-neutral-500">Aucun paiement pour l&apos;instant.</p> : null}
        </div>
      </section>
    </div>
  );
}
