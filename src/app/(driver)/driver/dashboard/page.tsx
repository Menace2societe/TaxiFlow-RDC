import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CarTaxiFront,
  CheckCircle2,
  CirclePause,
  Clock3,
  ReceiptText,
  TrendingUp,
  Wrench,
  Fuel
} from "lucide-react";
import { reportBreakdown } from "@/actions/breakdowns";
import { recordDriverPayment } from "@/actions/payments";
import { VehicleStatusControls } from "@/components/VehicleStatusControls";
import {
  getCurrentUserId,
  getDriverAssignedVehicle,
  getDriverRecentBreakdowns,
  getDriverRecentEntries,
  getDriverRecentPayments
} from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { BreakdownStatus, PaymentStatus, VehicleStatus } from "@/lib/supabase/types";
import { formatCDF } from "@/lib/utils/currency";

type DriverDashboardPageProps = {
  searchParams?: { error?: string; payment?: string; breakdown?: string };
};

const vehicleStatusView: Record<VehicleStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  active: {
    label: "En service",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    icon: CheckCircle2
  },
  maintenance: {
    label: "Maintenance",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    icon: Wrench
  },
  inactive: {
    label: "Au repos",
    className: "border-neutral-600 bg-neutral-800/80 text-neutral-300",
    icon: CirclePause
  }
};

const paymentStatusView: Record<PaymentStatus, { label: string; badgeClass: string; dotClass: string }> = {
  approved: { label: "Approuvé", badgeClass: "badge badge-green", dotClass: "bg-emerald-400" },
  pending:  { label: "En attente", badgeClass: "badge badge-amber", dotClass: "bg-amber-400" },
  rejected: { label: "Rejeté", badgeClass: "badge badge-red", dotClass: "bg-red-400" }
};

const breakdownStatusView: Record<BreakdownStatus, { label: string; badgeClass: string }> = {
  open:        { label: "Ouverte",  badgeClass: "badge badge-amber" },
  in_progress: { label: "En cours", badgeClass: "badge badge-cyan" },
  resolved:    { label: "Résolue",  badgeClass: "badge badge-green" }
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function DriverDashboardPage({ searchParams }: DriverDashboardPageProps) {
  const driverId = await getCurrentUserId();

  if (!driverId) {
    redirect(loginWithNext(ROUTES.DRIVER_DASHBOARD));
  }

  const [vehicle, entries, payments, breakdowns] = await Promise.all([
    getDriverAssignedVehicle(driverId),
    getDriverRecentEntries(driverId, 8),
    getDriverRecentPayments(driverId, 8),
    getDriverRecentBreakdowns(driverId, 8)
  ]);

  const recentRevenue = entries.reduce((sum, entry) => sum + entry.revenue_cdf, 0);
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const approvedAmount = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.amount, 0);
  const openBreakdowns = breakdowns.filter((breakdown) => breakdown.status !== "resolved").length;
  const currentStatus = vehicle ? vehicleStatusView[vehicle.status] : null;
  const StatusIcon = currentStatus?.icon ?? CirclePause;
  const dailyTarget = vehicle?.target_daily_revenue ?? 0;
  const progressPct = dailyTarget > 0 ? Math.min(100, Math.round((recentRevenue / dailyTarget) * 100)) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* ─── Header hero ─────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/30 p-6 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Espace chauffeur</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Tableau de bord terrain</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Contrôle du véhicule, déclaration des versements et suivi maintenance en temps réel.
            </p>
          </div>
          {currentStatus ? (
            <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${currentStatus.className}`}>
              <StatusIcon size={16} aria-hidden />
              {currentStatus.label}
            </span>
          ) : (
            <span className="badge badge-neutral">Aucun véhicule</span>
          )}
        </div>
      </header>

      {/* ─── Alertes ─────────────────────────────────────────────────────────── */}
      {searchParams?.error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={16} className="shrink-0" />
          {searchParams.error}
        </div>
      )}
      {searchParams?.payment && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0" />
          Versement déclaré et envoyé pour validation investisseur.
        </div>
      )}
      {searchParams?.breakdown && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <Wrench size={16} className="shrink-0" />
          Panne signalée. Le statut du véhicule a été mis en maintenance.
        </div>
      )}

      {/* ─── KPI Cards ───────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Recettes récentes */}
        <div className="card p-5 stat-glow-emerald">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <ReceiptText className="text-emerald-400" size={20} aria-hidden />
            </div>
            <span className="badge badge-green text-[10px]">
              <TrendingUp size={10} />
              8 dernières
            </span>
          </div>
          <p className="mt-4 text-sm text-neutral-400">Recettes récentes</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatCDF(recentRevenue)}</p>
          {dailyTarget > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>Objectif journalier</span>
                <span className="text-emerald-400">{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Versements en attente */}
        <div className="card p-5 stat-glow-amber">
          <div className="rounded-lg bg-amber-500/10 p-2.5 w-fit">
            <Clock3 className="text-amber-400" size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">En attente de validation</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatCDF(pendingAmount)}</p>
          <p className="mt-1 text-xs text-neutral-500">{pendingPayments.length} versement(s)</p>
        </div>

        {/* Objectif journalier */}
        <div className="card p-5 stat-glow-cyan">
          <div className="rounded-lg bg-cyan-500/10 p-2.5 w-fit">
            <Banknote className="text-cyan-400" size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">Versements approuvés</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatCDF(approvedAmount)}</p>
          <p className="mt-1 text-xs text-neutral-500">Total confirmé</p>
        </div>

        {/* Pannes ouvertes */}
        <div className={`card p-5 ${openBreakdowns > 0 ? "stat-glow-red" : ""}`}>
          <div className={`rounded-lg p-2.5 w-fit ${openBreakdowns > 0 ? "bg-red-500/10" : "bg-neutral-800"}`}>
            <AlertTriangle className={openBreakdowns > 0 ? "text-red-400" : "text-neutral-500"} size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">Pannes actives</p>
          <p className={`mt-1 text-2xl font-bold ${openBreakdowns > 0 ? "text-red-300" : "text-white"}`}>
            {openBreakdowns}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Non résolues</p>
        </div>
      </section>

      {/* ─── Véhicule + Actions rapides ──────────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Véhicule assigné */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <CarTaxiFront size={28} className="text-emerald-400" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white">Véhicule assigné</h2>
              {vehicle ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-white truncate">{vehicle.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="badge badge-neutral">
                      {vehicle.plate_number}
                    </span>
                    <span className="badge badge-neutral uppercase">
                      {vehicle.type}
                    </span>
                    {currentStatus && (
                      <span className={`badge ${
                        vehicle.status === "active" ? "badge-green" :
                        vehicle.status === "maintenance" ? "badge-amber" : "badge-neutral"
                      }`}>
                        {currentStatus.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">
                    Objectif journalier : <span className="text-neutral-300 font-medium">{formatCDF(vehicle.target_daily_revenue)}</span>
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-neutral-400">
                  Aucun véhicule assigné. Contactez votre investisseur.
                </p>
              )}
            </div>
          </div>

          {vehicle && (
            <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Changer le statut du véhicule
              </p>
              <VehicleStatusControls vehicleId={vehicle.id} currentStatus={vehicle.status} />
            </div>
          )}
        </div>

        {/* Formulaires actions rapides */}
        <div className="grid gap-4">
          {/* Déclarer un versement */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Banknote className="text-emerald-400" size={18} aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-white">Déclarer un versement</h2>
            </div>
            <form action={recordDriverPayment} className="grid gap-3">
              <input type="hidden" name="return_path" value={ROUTES.DRIVER_DASHBOARD} />
              <div>
                <label htmlFor="payment-amount" className="mb-1.5 block text-xs font-medium text-neutral-400">
                  Montant en CDF
                </label>
                <input
                  id="payment-amount"
                  className="field"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  placeholder="Ex : 15 000"
                  disabled={!vehicle}
                  required
                />
              </div>
              <button
                className="btn-primary w-full"
                type="submit"
                disabled={!vehicle}
              >
                <Banknote size={17} aria-hidden />
                Envoyer le versement
              </button>
              {!vehicle && (
                <p className="text-center text-xs text-neutral-500">Aucun véhicule assigné</p>
              )}
            </form>
          </div>

          {/* Signaler une panne */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-amber-500/15 p-2">
                <AlertTriangle className="text-amber-400" size={18} aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-amber-100">Signaler une panne</h2>
            </div>
            <form action={reportBreakdown} className="grid gap-3">
              <div>
                <label htmlFor="breakdown-type" className="mb-1.5 block text-xs font-medium text-neutral-400">
                  Type de panne
                </label>
                <select
                  id="breakdown-type"
                  className="field"
                  name="type"
                  disabled={!vehicle}
                  defaultValue=""
                >
                  <option value="" disabled>Choisir le type...</option>
                  <option value="Moteur">Moteur</option>
                  <option value="Pneu">Pneu</option>
                  <option value="Freinage">Freinage</option>
                  <option value="Electricite">Electricite</option>
                  <option value="Accident">Accident</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label htmlFor="breakdown-cost" className="mb-1.5 block text-xs font-medium text-neutral-400">
                  Coût estimé (CDF)
                </label>
                <input
                  id="breakdown-cost"
                  className="field"
                  name="estimated_cost"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder="0"
                  disabled={!vehicle}
                />
              </div>
              <div>
                <label htmlFor="breakdown-desc" className="mb-1.5 block text-xs font-medium text-neutral-400">
                  Description courte
                </label>
                <input
                  id="breakdown-desc"
                  className="field"
                  name="description"
                  maxLength={500}
                  placeholder="Ex : crevaison roue arrière"
                  disabled={!vehicle}
                />
              </div>
              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                type="submit"
                disabled={!vehicle}
              >
                <Wrench size={16} aria-hidden />
                Signaler la panne
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── Tableaux historiques ─────────────────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-2">

        {/* Historique des versements */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Historique des versements</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Statuts de validation investisseur</p>
            </div>
            <Banknote size={18} className="text-neutral-600" aria-hidden />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const sv = paymentStatusView[payment.status];
                  return (
                    <tr key={payment.id}>
                      <td className="text-neutral-400">{formatDate(payment.created_at)}</td>
                      <td className="font-semibold text-white">{formatCDF(payment.amount)}</td>
                      <td>
                        <span className={sv.badgeClass}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sv.dotClass}`} />
                          {sv.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-neutral-500" colSpan={3}>
                      Aucun versement déclaré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historique des pannes */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Historique des pannes</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Suivi maintenance de votre véhicule</p>
            </div>
            <Wrench size={18} className="text-neutral-600" aria-hidden />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Coût</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {breakdowns.map((breakdown) => {
                  const sv = breakdownStatusView[breakdown.status];
                  return (
                    <tr key={breakdown.id}>
                      <td className="whitespace-nowrap text-neutral-400">{formatDate(breakdown.created_at)}</td>
                      <td>
                        <p className="font-medium text-white">{breakdown.type}</p>
                        {breakdown.description && (
                          <p className="mt-0.5 max-w-[160px] truncate text-xs text-neutral-500">
                            {breakdown.description}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-neutral-300">
                        {formatCDF(breakdown.estimated_cost)}
                      </td>
                      <td>
                        <span className={sv.badgeClass}>{sv.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {breakdowns.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-neutral-500" colSpan={4}>
                      Aucune panne signalée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </section>
    </div>
  );
}
