import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CarTaxiFront,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
  Wrench,
  Activity,
  BadgeCheck
} from "lucide-react";
import { reportBreakdown } from "@/actions/breakdowns";
import { recordDriverPayment } from "@/actions/payments";
import { VehicleStatusControls } from "@/components/VehicleStatusControls";
import { OwnerDriverRegisterVehicleForm } from "@/components/driver/OwnerDriverRegisterVehicleForm";
import {
  getCurrentUserId,
  getDriverAssignedVehicle,
  getDriverProfile,
  getDriverRecentPayments
} from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { PaymentStatus } from "@/lib/supabase/types";
import { formatCDF } from "@/lib/utils/currency";

type PortalPageProps = {
  searchParams?: Promise<{ error?: string; payment?: string; breakdown?: string }>;
};

const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  approved: {
    label: "Approuvé",
    badgeClass: "badge badge-green",
    dotClass: "bg-emerald-400"
  },
  pending: {
    label: "En attente",
    badgeClass: "badge badge-amber",
    dotClass: "bg-amber-400"
  },
  rejected: {
    label: "Rejeté",
    badgeClass: "badge badge-red",
    dotClass: "bg-red-400"
  }
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short"
  }).format(new Date(iso));
}

export default async function DriverPortalPage({ searchParams }: PortalPageProps) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(loginWithNext(ROUTES.DRIVER_PORTAL));
  }

  const [vehicle, recentPayments, driverProfile] = await Promise.all([
    getDriverAssignedVehicle(userId),
    getDriverRecentPayments(userId, 8),
    getDriverProfile(userId)
  ]);

  const hasVehicle = Boolean(vehicle);
  const isOwnerDriver = Boolean(driverProfile?.is_owner_driver);
  const pendingTotal = recentPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
  const approvedTotal = recentPayments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.amount, 0);
  const rejectedTotal = recentPayments
    .filter((p) => p.status === "rejected")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-12 animate-fade-in-up">

      {/* ─── Hero Header ───────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/30 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.08)_0%,_transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Activity size={10} />
              Portail Terrain
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Portail chauffeur</h1>
            <p className="mt-1.5 text-sm text-neutral-400">
              Versements, statut véhicule et signalement de panne.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CarTaxiFront size={24} className="text-emerald-400" />
          </div>
        </div>
      </header>

      {/* ─── Alertes ───────────────────────────────────────────────────────────── */}
      {params?.error && (
        <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fade-in">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{params.error}</span>
        </div>
      )}
      {params?.payment && (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 animate-fade-in">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>Versement déclaré avec succès !</span>
        </div>
      )}
      {params?.breakdown && (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 animate-fade-in">
          <Wrench size={15} className="shrink-0" />
          <span>Panne signalée. Statut du véhicule mis à jour.</span>
        </div>
      )}

      {/* ─── Résumé KPI ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-3">
        <div className="card p-4 stat-glow-amber">
          <div className="rounded-lg bg-amber-500/10 p-2 w-fit">
            <Clock3 className="text-amber-400" size={16} aria-hidden />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">En attente</p>
          <p className="mt-1 text-lg font-bold text-white tabular-nums">{formatCDF(pendingTotal)}</p>
        </div>
        <div className="card p-4 stat-glow-emerald">
          <div className="rounded-lg bg-emerald-500/10 p-2 w-fit">
            <ReceiptText className="text-emerald-400" size={16} aria-hidden />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Approuvé</p>
          <p className="mt-1 text-lg font-bold text-white tabular-nums">{formatCDF(approvedTotal)}</p>
        </div>
        <div className="card p-4 stat-glow-red">
          <div className="rounded-lg bg-red-500/10 p-2 w-fit">
            <TrendingUp className="text-red-400" size={16} aria-hidden />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Rejeté</p>
          <p className="mt-1 text-lg font-bold text-white tabular-nums">{formatCDF(rejectedTotal)}</p>
        </div>
      </section>

      {/* ─── Véhicule + Statut ─────────────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="card-header flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <CarTaxiFront className="text-emerald-400" size={18} aria-hidden />
          </div>
          <h2 className="text-base font-semibold text-white">Mon véhicule</h2>
        </div>

        <div className="p-5">
          {vehicle ? (
            <>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-white truncate">{vehicle.label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="badge badge-neutral">{vehicle.plate_number}</span>
                    <span className="badge badge-neutral uppercase">{vehicle.type}</span>
                    <span className={`badge ${
                      vehicle.status === "en service" ? "badge-green" :
                      vehicle.status === "maintenance" ? "badge-amber" : "badge-neutral"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        vehicle.status === "en service" ? "bg-emerald-400" :
                        vehicle.status === "maintenance" ? "bg-amber-400" : "bg-neutral-400"
                      }`} />
                      {vehicle.status === "en service" ? "En service" :
                       vehicle.status === "maintenance" ? "Maintenance" : "Au repos"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">Objectif / jour</p>
                  <p className="text-base font-bold text-emerald-400">{formatCDF(vehicle.target_daily_revenue)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                <p className="mb-3 section-label">Changer le statut du véhicule</p>
                <VehicleStatusControls vehicleId={vehicle.id} currentStatus={vehicle.status} compact />
              </div>
            </>
          ) : isOwnerDriver ? (
            /* ─── Chauffeur-patron sans véhicule : formulaire d'auto-enregistrement ─── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
                <BadgeCheck size={15} className="text-emerald-400 shrink-0" />
                <p className="text-xs font-medium text-emerald-300">
                  Mode chauffeur-patron actif — Enregistrez votre propre véhicule ci-dessous.
                </p>
              </div>
              <OwnerDriverRegisterVehicleForm />
            </div>
          ) : (
            /* ─── Chauffeur standard sans véhicule : message d'attente ─── */
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
                <CarTaxiFront size={22} className="text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-300">Aucun véhicule assigné</p>
                <p className="mt-1 text-xs text-neutral-500">Contactez votre investisseur pour être assigné à un véhicule.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Déclarer un versement ─────────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="card-header flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <Banknote className="text-emerald-400" size={18} aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Déclarer un versement</h2>
            <p className="text-xs text-neutral-500">Montant en Francs Congolais (CDF)</p>
          </div>
        </div>
        <div className="p-5">
          <form action={recordDriverPayment} className="grid gap-3">
            <input type="hidden" name="return_path" value={ROUTES.DRIVER_PORTAL} />
            <div>
              <label
                htmlFor="portal-amount"
                className="mb-1.5 block text-xs font-medium text-neutral-400"
              >
                Montant en CDF
              </label>
              <input
                id="portal-amount"
                className="field"
                name="amount"
                type="number"
                min="1"
                step="1"
                inputMode="decimal"
                placeholder="Ex : 15 000"
                disabled={!hasVehicle}
                required
              />
            </div>
            <button
              id="portal-submit-payment"
              className="btn-primary w-full"
              type="submit"
              disabled={!hasVehicle}
            >
              <Banknote size={17} aria-hidden />
              Enregistrer le versement
            </button>
            {!hasVehicle && (
              <p className="text-center text-xs text-neutral-500">
                Véhicule requis pour déclarer un versement
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ─── Signaler une panne ────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-3 border-b border-amber-500/20 px-5 py-4">
          <div className="rounded-lg bg-amber-500/15 p-2">
            <AlertTriangle className="text-amber-400" size={18} aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-amber-100">Signaler une panne</h2>
            <p className="text-xs text-amber-400/60">Met le véhicule en mode maintenance</p>
          </div>
        </div>
        <div className="p-5">
          <form action={reportBreakdown} className="grid gap-3">
            <div>
              <label
                htmlFor="portal-breakdown-type"
                className="mb-1.5 block text-xs font-medium text-neutral-400"
              >
                Type de panne
              </label>
              <select
                id="portal-breakdown-type"
                className="field"
                name="type"
                disabled={!hasVehicle}
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
              <label
                htmlFor="portal-breakdown-cost"
                className="mb-1.5 block text-xs font-medium text-neutral-400"
              >
                Coût estimé en CDF (optionnel)
              </label>
              <input
                id="portal-breakdown-cost"
                className="field"
                name="estimated_cost"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                placeholder="0"
                disabled={!hasVehicle}
              />
            </div>
            <div>
              <label
                htmlFor="portal-breakdown-desc"
                className="mb-1.5 block text-xs font-medium text-neutral-400"
              >
                Description courte
              </label>
              <input
                id="portal-breakdown-desc"
                className="field"
                name="description"
                maxLength={500}
                placeholder="Ex : crevaison roue arrière gauche"
                disabled={!hasVehicle}
              />
            </div>
            <button
              id="portal-submit-breakdown"
              className="btn-warning w-full"
              type="submit"
              disabled={!hasVehicle}
            >
              <Wrench size={16} aria-hidden />
              Signaler la panne
            </button>
          </form>
        </div>
      </section>

      {/* ─── Historique des versements ─────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Historique des versements</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{recentPayments.length} versement(s) récent(s)</p>
          </div>
          <Banknote size={16} className="text-neutral-600" aria-hidden />
        </div>

        {recentPayments.length > 0 ? (
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
                {recentPayments.map((payment) => {
                  const sv = paymentStatusConfig[payment.status];
                  return (
                    <tr key={payment.id}>
                      <td className="text-neutral-400 whitespace-nowrap">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="font-bold text-white tabular-nums">
                        {formatCDF(payment.amount)}
                      </td>
                      <td>
                        <span className={sv.badgeClass}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sv.dotClass}`} />
                          {sv.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
              <ReceiptText size={18} className="text-neutral-600" />
            </div>
            <p className="text-sm text-neutral-500">Aucun versement déclaré pour le moment.</p>
          </div>
        )}
      </section>

      {/* ─── Lien Dashboard complet ────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <Link
          href={ROUTES.DRIVER_DASHBOARD}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-5 py-2.5 text-sm font-medium text-neutral-300 transition-all hover:bg-neutral-700 hover:text-white"
        >
          <LayoutDashboard size={16} aria-hidden />
          Ouvrir le dashboard complet
        </Link>
      </div>

    </div>
  );
}
