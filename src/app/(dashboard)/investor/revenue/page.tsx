import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { MonthBars, StateMark, dayStateLabels, paymentDayState } from "@/components/driver/plate";
import { InvestorPaymentActions } from "@/components/investor/InvestorPaymentActions";
import { ManualPaymentModal } from "@/components/investor/ManualPaymentModal";
import {
  getCurrentUserId,
  getInvestorPayments,
  getInvestorPaymentTrend,
  getInvestorFleetDrivers,
  type InvestorPayment
} from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";
import { formatCDF } from "@/lib/utils/currency";

/** « 2026-10-29 » → « Jeu. 29 oct. » : le jour du versement. */
function payDay(isoDate: string) {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)
  );
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function sourceLabel(source: string) {
  return source === "manual_backup" ? "Saisi à la main" : "Déclaré par le chauffeur";
}

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

// ─── Métadonnées SEO ──────────────────────────────────────────────────────────

export const metadata = {
  title: "Revenus — TaxiFlow RDC",
  description: "Suivi et validation des versements de votre flotte TaxiFlow"
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestorRevenuePage() {
  const investorId = await getCurrentUserId();
  if (!investorId) {
    redirect(loginWithNext(ROUTES.INVESTOR_REVENUE));
  }

  // Requêtes parallèles — aucun waterfall
  const [payments, trend, fleetDrivers] = await Promise.all([
    getInvestorPayments(investorId, 40),
    getInvestorPaymentTrend(investorId, 30),
    getInvestorFleetDrivers(investorId)
  ]);

  const approvedPayments = payments.filter((p) => p.status === "approved" || p.status === "validated");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const rejectedPayments = payments.filter((p) => p.status === "rejected");

  const totalApproved = approvedPayments.reduce((s, p) => s + p.amount, 0);
  const totalPending = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const totalRejected = rejectedPayments.reduce((s, p) => s + p.amount, 0);

  const figures: Array<{ state: "ok" | "wait" | "bad"; list: InvestorPayment[]; total: number }> = [
    { state: "ok", list: approvedPayments, total: totalApproved },
    { state: "wait", list: pendingPayments, total: totalPending },
    { state: "bad", list: rejectedPayments, total: totalRejected }
  ];

  return (
    <div className="pb-6">
      {/* ─── En-tête ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-plate text-[30px] font-bold leading-tight">Revenus et versements</h1>
          <p className="mt-1 text-[16px]">Validez les versements de vos chauffeurs et suivez ce qui rentre, jour après jour.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className="btn-secondary min-h-12 px-4" href={`${ROUTES.INVESTOR_REVENUE}/export?type=payments`} download>
            <Download size={18} aria-hidden />
            Versements (CSV)
          </a>
          <a className="btn-secondary min-h-12 px-4" href={`${ROUTES.INVESTOR_REVENUE}/export?type=entries`} download>
            <Download size={18} aria-hidden />
            Recettes (CSV)
          </a>
          <ManualPaymentModal drivers={fleetDrivers} />
        </div>
      </header>

      {/* ─── À valider (la seule vignette jaune de l'écran) ─────────────────── */}
      {pendingPayments.length > 0 ? (
        <section aria-labelledby="pending-title" className="mt-6 rounded-2xl bg-plate-vignette px-5 pb-5 pt-4">
          <h2 id="pending-title" className="flex items-center gap-2.5 font-plate text-[30px] font-bold leading-[1.05]">
            <StateMark state="wait" className="h-4 w-4" />
            {plural(pendingPayments.length, "versement")} à valider
          </h2>
          <p className="mt-2 text-[16px] leading-snug">
            <b>{formatCDF(totalPending)}</b> déclarés par vos chauffeurs attendent votre décision. Vérifiez la photo du compteur, puis
            validez ou rejetez.
          </p>
          <ol className="mt-3 border-b-2 border-plate-ink/25">
            {pendingPayments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col gap-3 border-t-2 border-plate-ink/25 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-baseline justify-between gap-3 sm:justify-start sm:gap-5">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-bold">{payment.driver_name ?? "Chauffeur inconnu"}</p>
                    <p className="truncate text-[15px]">
                      {payDay(payment.payment_date)}
                      {payment.vehicle_label ? ` · ${payment.vehicle_label}` : ""} · {sourceLabel(payment.source)}
                    </p>
                  </div>
                  <span className="shrink-0 font-plate text-[22px] font-bold">{formatCDF(payment.amount)}</span>
                </div>
                <InvestorPaymentActions paymentId={payment.id} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ─── Les chiffres ───────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="figures-title">
          <h2 id="figures-title" className="font-plate text-[24px] font-bold">
            Les {payments.length > 1 ? `${payments.length} derniers versements` : "derniers versements"}
          </h2>
          <dl className="mt-2 border-b-2 border-plate-rule text-[16px]">
            {figures.map(({ state, list, total }) => (
              <div key={state} className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
                <dt className="flex flex-wrap items-center gap-x-2 font-semibold">
                  <StateMark state={state} />
                  {dayStateLabels[state]}
                  <span className="w-full pl-[22px] text-[15px] font-normal text-plate-soft">
                    {list.length === 0 ? "Aucun" : plural(list.length, "versement")}
                  </span>
                </dt>
                <dd className={cn("font-plate text-[22px] font-bold", state === "bad" && total > 0 && "text-plate-bad")}>
                  {formatCDF(total)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ─── Tendance 30 jours ──────────────────────────────────────────── */}
        <section aria-labelledby="trend-title">
          <h2 id="trend-title" className="font-plate text-[24px] font-bold">
            Versements validés, 30 jours
          </h2>
          <div className="mt-3">
            <MonthBars points={trend} target={0} />
          </div>
        </section>
      </div>

      {/* ─── Historique ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="history-title" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="history-title" className="font-plate text-[24px] font-bold">
            Historique des versements
          </h2>
          <p className="text-[15px] text-plate-soft">Les plus récents en premier</p>
        </div>

        {payments.length > 0 ? (
          <>
            {/* Téléphone : une ligne par versement */}
            <ol className="mt-2 border-b-2 border-plate-rule md:hidden">
              {payments.map((payment) => {
                const state = paymentDayState(payment.status);
                return (
                  <li key={payment.id} className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-bold">{payment.driver_name ?? "Chauffeur inconnu"}</p>
                      <p className="truncate text-[15px]">
                        {payDay(payment.payment_date)}
                        {payment.vehicle_label ? ` · ${payment.vehicle_label}` : ""}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-[14px] font-semibold">
                        <StateMark state={state} />
                        {dayStateLabels[state]}
                        {payment.source === "manual_backup" ? <span className="font-normal">· saisi à la main</span> : null}
                      </p>
                    </div>
                    <span className={cn("shrink-0 font-plate text-[21px] font-bold", state === "bad" && "text-plate-bad")}>
                      {formatCDF(payment.amount)}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* Ordinateur : tableau simple */}
            <table className="mt-2 hidden w-full border-b-2 border-plate-rule text-left text-[15px] md:table">
              <thead>
                <tr className="text-[14px] font-semibold">
                  <th scope="col" className="py-2 pr-4 font-semibold">Date</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Chauffeur</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Véhicule</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Saisie</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">État</th>
                  <th scope="col" className="py-2 text-right font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const state = paymentDayState(payment.status);
                  return (
                    <tr key={payment.id} className="border-t-2 border-plate-rule">
                      <td className="whitespace-nowrap py-3 pr-4 font-semibold">{payDay(payment.payment_date)}</td>
                      <td className="py-3 pr-4 font-bold">{payment.driver_name ?? "Chauffeur inconnu"}</td>
                      <td className="py-3 pr-4">{payment.vehicle_label ?? "—"}</td>
                      <td className="py-3 pr-4">{payment.source === "manual_backup" ? "À la main" : "Chauffeur"}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2 font-semibold">
                          <StateMark state={state} />
                          {dayStateLabels[state]}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap py-3 text-right font-plate text-[21px] font-bold",
                          state === "bad" && "text-plate-bad"
                        )}
                      >
                        {formatCDF(payment.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pendingPayments.length > 0 ? (
              <p className="mt-3 text-[15px]">
                Les versements en attente se valident dans le cadre jaune, en haut de la page.
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-2 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
            <p className="text-[17px] font-bold">Aucun versement déclaré</p>
            <p className="mt-1 text-[16px]">
              Les versements de vos chauffeurs apparaissent ici dès leur déclaration. Vous pouvez aussi en saisir un à la main.
            </p>
            <div className="mt-4">
              <ManualPaymentModal drivers={fleetDrivers} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
