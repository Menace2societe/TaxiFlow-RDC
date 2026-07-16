import { redirect } from "next/navigation";
import {
  BarChart3,
  Banknote,
  CheckCircle2,
  Clock3,
  XCircle,
  ReceiptText,
  TrendingUp,
  CarTaxiFront,
  Sparkles
} from "lucide-react";
import { InvestorPaymentActions } from "@/components/investor/InvestorPaymentActions";
import { ManualPaymentModal } from "@/components/investor/ManualPaymentModal";
import { RevenueTrendChart } from "@/components/shared/RevenueTrendChart";
import {
  getCurrentUserId,
  getInvestorPayments,
  getInvestorPaymentTrend,
  getInvestorFleetDrivers
} from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { PaymentStatus } from "@/lib/supabase/types";
import { formatCDF } from "@/lib/utils/currency";

// ─── Config statuts ───────────────────────────────────────────────────────────

const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  approved:  { label: "Approuvé",   badgeClass: "badge badge-green",   dotClass: "bg-emerald-400" },
  validated: { label: "Validé",     badgeClass: "badge badge-green",   dotClass: "bg-emerald-400" },
  pending:   { label: "En attente", badgeClass: "badge badge-amber",   dotClass: "bg-amber-400"   },
  rejected:  { label: "Rejeté",    badgeClass: "badge badge-red",     dotClass: "bg-red-400"      }
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(iso));
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

  // ─── KPI ─────────────────────────────────────────────────────────────────
  const approvedPayments = payments.filter(
    (p) => p.status === "approved" || p.status === "validated"
  );
  const pendingPayments  = payments.filter((p) => p.status === "pending");
  const rejectedPayments = payments.filter((p) => p.status === "rejected");

  const totalApproved = approvedPayments.reduce((s, p) => s + p.amount, 0);
  const totalPending  = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const totalRejected = rejectedPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/20 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.07)_0%,_transparent_65%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <BarChart3 size={10} />
              Portail Investisseur
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Revenus &amp; Versements</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Validez les versements de vos chauffeurs et suivez l&apos;évolution de vos revenus.
            </p>
          </div>
          <div className="shrink-0">
            <ManualPaymentModal drivers={fleetDrivers} />
          </div>
        </div>
      </header>

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Résumé des versements">

        {/* Approuvés */}
        <div className="card p-5 stat-glow-emerald">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <CheckCircle2 className="text-emerald-400" size={20} aria-hidden />
            </div>
            <span className="badge badge-green text-[10px]">
              <TrendingUp size={10} />
              {approvedPayments.length}
            </span>
          </div>
          <p className="mt-4 text-sm text-neutral-400">Versements approuvés</p>
          <p className="mt-1 text-2xl font-bold text-white tabular-nums">
            {formatCDF(totalApproved)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{approvedPayments.length} versement(s)</p>
        </div>

        {/* En attente */}
        <div className="card p-5 stat-glow-amber">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <Clock3 className="text-amber-400" size={20} aria-hidden />
            </div>
            {pendingPayments.length > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingPayments.length}
              </span>
            )}
          </div>
          <p className="mt-4 text-sm text-neutral-400">En attente de validation</p>
          <p className="mt-1 text-2xl font-bold text-white tabular-nums">
            {formatCDF(totalPending)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {pendingPayments.length === 0
              ? "Aucun en attente"
              : `${pendingPayments.length} à traiter`}
          </p>
        </div>

        {/* Rejetés */}
        <div className="card p-5 stat-glow-red">
          <div className="rounded-lg bg-red-500/10 p-2.5 w-fit">
            <XCircle className="text-red-400" size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">Versements rejetés</p>
          <p className="mt-1 text-2xl font-bold text-white tabular-nums">
            {formatCDF(totalRejected)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{rejectedPayments.length} versement(s)</p>
        </div>

      </section>

      {/* ─── Graphique de tendance ────────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Tendance des revenus</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Versements approuvés — 30 derniers jours
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <Sparkles size={10} />
            30 jours
          </div>
        </div>
        <div className="p-5">
          <RevenueTrendChart data={trend} color="#10b981" height={220} />
        </div>
      </section>

      {/* ─── Table des versements ─────────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Historique des versements</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {payments.length} versement(s) — les plus récents en premier
            </p>
          </div>
          <ReceiptText size={18} className="text-neutral-600" aria-hidden />
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Chauffeur</th>
                  <th>Véhicule</th>
                  <th>Montant</th>
                  <th>Source</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const sv = paymentStatusConfig[payment.status];
                  const isPending = payment.status === "pending";
                  return (
                    <tr key={payment.id}>
                      {/* Date */}
                      <td className="whitespace-nowrap text-neutral-400 text-xs">
                        {formatDate(payment.payment_date)}
                      </td>

                      {/* Chauffeur */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-500">
                            <CarTaxiFront size={13} />
                          </div>
                          <span className="text-sm font-medium text-white">
                            {payment.driver_name ?? (
                              <span className="italic text-neutral-500">Inconnu</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Véhicule */}
                      <td className="text-sm text-neutral-400">
                        {payment.vehicle_label ?? (
                          <span className="italic text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Montant */}
                      <td className="font-bold text-white tabular-nums">
                        {formatCDF(payment.amount)}
                      </td>

                      {/* Source */}
                      <td>
                        {payment.source === "manual_backup" ? (
                          <span className="badge badge-cyan text-[10px]">Manuel</span>
                        ) : (
                          <span className="badge badge-neutral text-[10px]">Auto</span>
                        )}
                      </td>

                      {/* Statut */}
                      <td>
                        <span className={sv.badgeClass}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sv.dotClass}`} />
                          {sv.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        {isPending ? (
                          <InvestorPaymentActions paymentId={payment.id} />
                        ) : (
                          <span className="text-xs text-neutral-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* État vide */
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
              <Banknote size={20} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-300">Aucun versement déclaré</p>
              <p className="mt-1 text-xs text-neutral-500">
                Les versements de vos chauffeurs apparaîtront ici dès leur déclaration.
              </p>
            </div>
            <ManualPaymentModal drivers={fleetDrivers} />
          </div>
        )}
      </section>

    </div>
  );
}
