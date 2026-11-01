import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { StateMark, type DayState } from "@/components/driver/plate";
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

const paymentMarks: Record<string, DayState> = {
  initiated: "wait",
  accepted: "wait",
  completed: "ok",
  failed: "bad",
  rejected: "bad"
};

/** « 2026-10-12 » → « 12 octobre 2026 », sans décalage de fuseau. */
function formatDay(isoDate: string) {
  return new Intl.DateTimeFormat("fr-CD", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)
  );
}

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
    return <p className="text-[16px]">L&apos;abonnement n&apos;est pas encore disponible.</p>;
  }

  const { state, quote } = billing;
  // Même seuil que le bandeau du layout : 5 jours avant la fin.
  const statusMark: DayState = state.status === "expired" ? "bad" : state.daysLeft <= 5 ? "wait" : "ok";
  const paymentList = payments ?? [];

  return (
    <div className="pb-6">
      <h1 className="font-plate text-[30px] font-bold leading-tight">Abonnement</h1>

      {/* ─── Où vous en êtes ─── */}
      <dl className="mt-5 border-b-2 border-plate-rule text-[16px]">
        <div className="flex flex-col gap-1 border-t-2 border-plate-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="font-semibold">Statut</dt>
          <dd className="sm:text-right">
            <span className={`inline-flex items-center gap-2 font-bold ${state.status === "expired" ? "text-plate-bad" : ""}`}>
              <StateMark state={statusMark} />
              {statusLabels[state.status]}
            </span>
            <span className="block text-[15px]">
              {state.status === "expired"
                ? `Terminé le ${formatDay(state.accessUntil)}`
                : `Jusqu'au ${formatDay(state.accessUntil)} (${state.daysLeft} jour${state.daysLeft > 1 ? "s" : ""})`}
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-t-2 border-plate-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="font-semibold">Votre tarif mensuel</dt>
          <dd className="sm:text-right">
            <span className="block font-plate text-[26px] font-bold leading-tight">
              {quote.totalUsd === 0 ? "Gratuit" : `${quote.totalUsd.toLocaleString("fr-CD")} USD`}
            </span>
            <span className="block text-[15px]">
              {quote.vehicles} véhicule(s), dont {quote.freeVehicles} offert
              {quote.discountPercent ? ` · remise ${quote.discountPercent} %` : ""}
              {quote.totalUsd > 0 ? ` · ≈ ${Math.round(quote.totalUsd * rate.rate).toLocaleString("fr-CD")} CDF` : ""}
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-t-2 border-plate-rule py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="font-semibold">Grille</dt>
          <dd className="sm:text-right">
            <span className="block font-bold">
              {PRICE_PER_VEHICLE_USD.moto} USD par moto · {PRICE_PER_VEHICLE_USD.taxi} USD par taxi, chaque mois
            </span>
            <span className="block text-[15px]">
              {FREE_VEHICLES} véhicule offert, {TRIAL_DAYS} jours d&apos;essai,{" "}
              {VOLUME_DISCOUNTS.map((tier) => `-${tier.percent} % dès ${tier.minVehicles}`).join(", ")} véhicules.
            </span>
          </dd>
        </div>
      </dl>

      {state.status === "expired" ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border-2 border-plate-bad bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-bad">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          Vos données restent consultables, mais vous ne pouvez plus ajouter de véhicule payant tant que
          l&apos;abonnement n&apos;est pas renouvelé.
        </p>
      ) : null}

      {/* ─── Paiement ─── */}
      <section aria-labelledby="pay-title" className="mt-10">
        <h2 id="pay-title" className="font-plate text-[24px] font-bold">
          Payer par Mobile Money
        </h2>
        <div className="mt-3 rounded-xl border-2 border-plate-rule bg-plate-white p-4 md:p-5">
          {quote.totalUsd === 0 ? (
            <p className="text-[16px]">Avec un seul véhicule, TaxiFlow est gratuit. Rien à payer.</p>
          ) : isPawapayConfigured() ? (
            <SubscriptionPayForm monthlyUsd={quote.totalUsd} usdRate={rate.rate} defaultPhone={profile.phone} />
          ) : (
            <p className="text-[16px]">
              Le paiement en ligne arrive bientôt. En attendant, réglez en espèces auprès de l&apos;équipe TaxiFlow :
              votre abonnement sera prolongé immédiatement.
            </p>
          )}
          <p className="mt-3 text-[15px] text-plate-soft">
            Payer pendant l&apos;essai ne vous fait rien perdre : les mois payés commencent à la fin de l&apos;essai.
          </p>
        </div>
      </section>

      {/* ─── Historique ─── */}
      <section aria-labelledby="history-title" className="mt-10">
        <h2 id="history-title" className="font-plate text-[24px] font-bold">
          Historique
        </h2>
        {paymentList.length > 0 ? (
          <ul className="mt-2 border-b-2 border-plate-rule">
            {paymentList.map((payment) => {
              const mark = paymentMarks[payment.status] ?? "none";
              return (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-plate-rule py-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold">
                      {formatDay(payment.created_at)} · {payment.months} mois
                    </p>
                    <p className={`mt-0.5 flex items-center gap-2 text-[15px] font-semibold ${mark === "bad" ? "text-plate-bad" : ""}`}>
                      <StateMark state={mark} />
                      {paymentStatusLabels[payment.status] ?? payment.status}
                      <span className="font-normal text-plate-ink"> · {providerNames[payment.provider] ?? payment.provider}</span>
                    </p>
                  </div>
                  <span className="font-plate text-[21px] font-bold">
                    {Number(payment.amount).toLocaleString("fr-CD")} {payment.currency}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-5 text-[16px]">
            Aucun paiement pour l&apos;instant.
          </p>
        )}
      </section>
    </div>
  );
}
