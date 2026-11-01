import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { reportBreakdown } from "@/actions/breakdowns";
import { updateVehicleStatus, type VehicleOperationalStatus } from "@/actions/vehicles";
import { ContractInfoBanner } from "@/components/driver/ContractInfoBanner";
import { DriverVersementForm } from "@/components/driver/DriverVersementForm";
import {
  LicensePlate,
  MonthBars,
  StateMark,
  VehicleStatusText,
  dayStateLabels,
  paymentDayState,
  vehicleStatusLabels,
  type DayState
} from "@/components/driver/plate";
import { MaintenanceActionButtons } from "@/components/shared/MaintenanceActionButtons";
import {
  getCurrentUserId,
  getDriverAssignedVehicle,
  getDriverVehicleBreakdowns,
  getDriverRecentEntries,
  getDriverRecentPayments,
  getDriverProfile,
  getDriverActiveContract,
  getOwnerVehicles,
  getDriverPaymentTrend
} from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { BreakdownStatus, VehicleStatus } from "@/lib/supabase/types";
import { getUsdToCdfRate } from "@/lib/fx/rate";
import { cn } from "@/lib/utils/cn";
import { formatCDF } from "@/lib/utils/currency";

type DriverDashboardPageProps = {
  searchParams?: { error?: string; payment?: string; breakdown?: string };
};

const breakdownStateView: Record<BreakdownStatus, { label: string; state: DayState }> = {
  open: { label: "Panne signalée", state: "bad" },
  in_progress: { label: "Réparation en cours", state: "wait" },
  resolved: { label: "Réparée", state: "ok" }
};

const statusChoices: Array<{ value: VehicleOperationalStatus; db: VehicleStatus }> = [
  { value: "en service", db: "en service" },
  { value: "maintenance", db: "maintenance" },
  { value: "repos", db: "repos" }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/** « 2026-10-29 » → « Jeu. 29 oct. » : le jour du versement, pas l'heure de saisie. */
function payDay(isoDate: string) {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate}T12:00:00Z`)
  );
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export default async function DriverDashboardPage({ searchParams }: DriverDashboardPageProps) {
  const usdRate = await getUsdToCdfRate();
  const driverId = await getCurrentUserId();

  if (!driverId) {
    redirect(loginWithNext(ROUTES.DRIVER_DASHBOARD));
  }

  const [vehicle, entries, payments, breakdowns, driverProfile, activeContract, paymentTrend] = await Promise.all([
    getDriverAssignedVehicle(driverId),
    getDriverRecentEntries(driverId, 8),
    getDriverRecentPayments(driverId, 8),
    getDriverVehicleBreakdowns(driverId),
    getDriverProfile(driverId),
    getDriverActiveContract(driverId),
    getDriverPaymentTrend(driverId, 30)
  ]);

  const isOwnerDriver = driverProfile?.is_owner_driver === true;

  // Pour un Chauffeur-Patron, récupérer ses propres véhicules s'il n'en a pas un assigné
  const ownedVehicles = isOwnerDriver ? await getOwnerVehicles(driverId) : [];
  const displayVehicle = vehicle ?? (ownedVehicles[0] ?? null);

  const recentRevenue = entries.reduce((sum, entry) => sum + entry.revenue_cdf, 0);
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const approvedAmount = payments
    .filter((p) => p.status === "approved" || p.status === "validated")
    .reduce((sum, p) => sum + p.amount, 0);
  const openBreakdowns = breakdowns.filter((breakdown) => breakdown.status !== "resolved").length;
  const dailyTarget = displayVehicle?.target_daily_revenue ?? 0;
  const averagePerDay = entries.length ? Math.round(recentRevenue / entries.length) : 0;

  return (
    <div className="pb-6">
      {searchParams?.error ? (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border-2 border-plate-bad bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-bad">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.payment ? (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border-2 border-plate-ok bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-ok">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          Versement envoyé. Votre investisseur doit le valider.
        </p>
      ) : null}
      {searchParams?.breakdown ? (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border-2 border-plate-ink bg-plate-white px-4 py-3 text-[15px] font-semibold">
          <Wrench size={18} className="mt-0.5 shrink-0" aria-hidden />
          Panne signalée. Le véhicule passe en réparation.
        </p>
      ) : null}

      <div className="flex items-baseline justify-between gap-3">
        <h1 className="sr-only">Mes recettes</h1>
        {isOwnerDriver ? <span className="text-[15px] font-semibold">Chauffeur-propriétaire</span> : null}
      </div>

      {/* ─── Véhicule ─────────────────────────────────────────────────────── */}
      {displayVehicle ? (
        <>
          <div className="mt-3">
            <LicensePlate plateNumber={displayVehicle.plate_number} size="sm" />
          </div>
          <p className="mt-2 flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate">
              {displayVehicle.label} · <b>{displayVehicle.type === "moto" ? "moto-taxi" : "taxi"}</b>
            </span>
            <VehicleStatusText status={displayVehicle.status} />
          </p>
        </>
      ) : (
        <section className="mt-4 rounded-xl border-2 border-dashed border-plate-ink px-5 py-5">
          <h2 className="font-plate text-[24px] font-bold leading-tight">Pas encore de véhicule</h2>
          <p className="mt-1 text-[16px]">
            {isOwnerDriver
              ? "Aucun véhicule enregistré. Enregistrez-le depuis l'onglet Aujourd'hui."
              : "Aucun véhicule ne vous est affecté. Demandez à votre investisseur de vous en affecter un."}
          </p>
        </section>
      )}

      {/* ─── Contrat ──────────────────────────────────────────────────────── */}
      {activeContract && !isOwnerDriver ? (
        <div className="mt-6">
          <ContractInfoBanner contract={activeContract} />
        </div>
      ) : null}

      {/* ─── Les chiffres ─────────────────────────────────────────────────── */}
      <section aria-labelledby="figures-title" className="mt-8">
        <h2 id="figures-title" className="font-plate text-[24px] font-bold">
          Mes 8 derniers versements
        </h2>
        <dl className="mt-2 border-b-2 border-plate-rule text-[16px]">
          <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
            <dt className="flex items-center gap-2 font-semibold">
              <StateMark state="ok" />
              {dayStateLabels.ok}
            </dt>
            <dd className="font-plate text-[22px] font-bold">{formatCDF(approvedAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
            <dt className="flex flex-wrap items-center gap-x-2 font-semibold">
              <StateMark state="wait" />
              {dayStateLabels.wait}
              <span className="w-full pl-[22px] text-[15px] font-normal text-plate-soft">
                {pendingPayments.length} versement{pendingPayments.length > 1 ? "s" : ""}
              </span>
            </dt>
            <dd className="font-plate text-[22px] font-bold">{formatCDF(pendingAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
            <dt className="font-semibold">
              Moyenne par jour
              <span className="block text-[15px] font-normal text-plate-soft">
                Sur {entries.length} jour{entries.length > 1 ? "s" : ""} déclaré{entries.length > 1 ? "s" : ""}
                {dailyTarget > 0 ? `, objectif ${formatCDF(dailyTarget)}` : ""}
              </span>
            </dt>
            <dd className="font-plate text-[22px] font-bold">{formatCDF(averagePerDay)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3">
            <dt className="flex items-center gap-2 font-semibold">
              <StateMark state={openBreakdowns > 0 ? "bad" : "none"} />
              Pannes non réparées
            </dt>
            <dd className={cn("font-plate text-[22px] font-bold", openBreakdowns > 0 && "text-plate-bad")}>
              {openBreakdowns > 0 ? openBreakdowns : "Aucune"}
            </dd>
          </div>
        </dl>
      </section>

      {/* ─── Tendance 30 jours ────────────────────────────────────────────── */}
      <section aria-labelledby="trend-title" className="mt-10">
        <h2 id="trend-title" className="font-plate text-[24px] font-bold">
          Versements validés, 30 jours
        </h2>
        <div className="mt-3">
          <MonthBars points={paymentTrend} target={dailyTarget} />
        </div>
      </section>

      {/* ─── Historique des versements ────────────────────────────────────── */}
      <section aria-labelledby="payments-title" className="mt-10">
        <h2 id="payments-title" className="font-plate text-[24px] font-bold">
          Historique des versements
        </h2>
        {payments.length ? (
          <ol className="mt-2 border-b-2 border-plate-rule">
            {payments.map((payment) => {
              const state = paymentDayState(payment.status);
              return (
                <li key={payment.id} className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-2.5">
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold">
                      {payment.payment_date ? payDay(payment.payment_date) : formatDate(payment.created_at)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[14px] font-semibold">
                      <StateMark state={state} />
                      {dayStateLabels[state]}
                    </p>
                  </div>
                  <span className={cn("font-plate text-[21px] font-bold", state === "bad" && "text-plate-bad")}>
                    {formatCDF(payment.amount)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 border-y-2 border-plate-rule py-5 text-[16px]">
            Aucun versement déclaré. Déclarez le premier juste en dessous.
          </p>
        )}
      </section>

      {/* ─── Déclarer un versement ────────────────────────────────────────── */}
      <section id="declarer" aria-labelledby="declarer-title" className="mt-10 scroll-mt-4">
        <h2 id="declarer-title" className="font-plate text-[26px] font-bold">
          Déclarer mon versement
        </h2>
        <p className="mt-1 text-[16px]">
          Le compteur du matin, celui du soir, et une photo nette. Sans réseau, le versement part dès le retour de la connexion.
        </p>
        <div className="mt-4">
          <DriverVersementForm hasVehicle={Boolean(displayVehicle)} usdRate={usdRate.rate} />
        </div>
      </section>

      {/* ─── État du véhicule ─────────────────────────────────────────────── */}
      {displayVehicle ? (
        <section aria-labelledby="status-title" className="mt-10">
          <h2 id="status-title" className="font-plate text-[26px] font-bold">
            État du véhicule
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {statusChoices.map((choice) => {
              const active = displayVehicle.status === choice.db;
              return (
                <form key={choice.value} action={updateVehicleStatus.bind(null, displayVehicle.id, choice.value)}>
                  <button
                    type="submit"
                    aria-pressed={active}
                    className={cn(
                      "min-h-[52px] w-full rounded-xl border-2 border-plate-ink px-1 text-[15px] font-bold transition-colors",
                      active ? "bg-plate-ink text-plate-white" : "bg-plate-white text-plate-ink hover:bg-plate-ground"
                    )}
                  >
                    {vehicleStatusLabels[choice.db]}
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ─── Chauffeur-propriétaire : véhicules et raccourcis ─────────────── */}
      {isOwnerDriver ? (
        <section aria-labelledby="owner-title" className="mt-10">
          <h2 id="owner-title" className="font-plate text-[24px] font-bold">
            Mon véhicule, mes papiers
          </h2>
          <p className="mt-1 text-[16px]">Vous gérez votre propre véhicule : papiers et pannes sont ici.</p>
          <ul className="mt-3 border-b-2 border-plate-rule text-[16px]">
            <li className="border-t-2 border-plate-rule">
              <Link href={ROUTES.DRIVER_DOCUMENTS} className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                <span>
                  <span className="block font-bold underline underline-offset-4">Mes documents</span>
                  <span className="block text-[15px]">Carte rose, assurance, permis</span>
                </span>
              </Link>
            </li>
            <li className="border-t-2 border-plate-rule">
              <Link href={ROUTES.DRIVER_MAINTENANCE} className="flex min-h-[56px] items-center justify-between gap-3 py-2">
                <span>
                  <span className="block font-bold underline underline-offset-4">Pannes et réparations</span>
                  <span className="block text-[15px]">Suivre les pannes de vos véhicules</span>
                </span>
              </Link>
            </li>
            <li className="border-t-2 border-plate-rule py-3">
              <p className="font-bold">
                {ownedVehicles.length} véhicule{ownedVehicles.length > 1 ? "s" : ""} à votre nom
              </p>
              {ownedVehicles.length > 1 ? (
                <ul className="mt-1 text-[15px]">
                  {ownedVehicles.map((v) => (
                    <li key={v.id}>
                      {v.label}
                      {v.plate_number ? ` · ${v.plate_number}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          </ul>
        </section>
      ) : null}

      {/* ─── Signaler une panne ───────────────────────────────────────────── */}
      <section aria-labelledby="panne-title" className="mt-10">
        <h2 id="panne-title" className="font-plate text-[26px] font-bold">
          Signaler une panne
        </h2>
        <p className="mt-1 text-[16px]">Le véhicule passe en réparation et votre investisseur est prévenu.</p>
        <form action={reportBreakdown} className="mt-4 grid gap-4">
          <input type="hidden" name="driver_id" value={driverId} />
          <label htmlFor="breakdown-type" className="block text-[15px] font-semibold">
            Type de panne
            <select id="breakdown-type" className="field mt-1.5" name="type" defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              <option value="Moteur">Moteur</option>
              <option value="Pneu">Pneu</option>
              <option value="Freinage">Freins</option>
              <option value="Electricite">Électricité</option>
              <option value="Accident">Accident</option>
              <option value="Autre">Autre</option>
            </select>
          </label>
          <label htmlFor="breakdown-desc" className="block text-[15px] font-semibold">
            Ce qui s&apos;est passé
            <input
              id="breakdown-desc"
              className="field mt-1.5"
              name="description"
              maxLength={500}
              placeholder="Ex. : crevaison roue arrière gauche"
            />
          </label>
          <label htmlFor="breakdown-cost" className="block text-[15px] font-semibold">
            Coût estimé en FC (si vous le savez)
            <input
              id="breakdown-cost"
              className="field mt-1.5"
              name="estimated_cost"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="0"
            />
          </label>
          <button className="btn-warning w-full" type="submit">
            <Wrench size={18} aria-hidden />
            Signaler la panne
          </button>
        </form>
      </section>

      {/* ─── Historique des pannes ────────────────────────────────────────── */}
      <section aria-labelledby="breakdowns-title" className="mt-10">
        <h2 id="breakdowns-title" className="font-plate text-[24px] font-bold">
          Historique des pannes
        </h2>
        {breakdowns.length ? (
          <ol className="mt-2 border-b-2 border-plate-rule">
            {breakdowns.map((breakdown) => {
              const view = breakdownStateView[breakdown.status];
              return (
                <li key={breakdown.id} className="border-t-2 border-plate-rule py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold">{breakdown.type}</p>
                      {breakdown.description ? <p className="mt-0.5 text-[15px]">{breakdown.description}</p> : null}
                      <p className="mt-0.5 text-[15px] text-plate-soft">{formatDate(breakdown.created_at)}</p>
                    </div>
                    <span className="shrink-0 font-plate text-[21px] font-bold">{formatCDF(breakdown.estimated_cost)}</span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-2 text-[14px] font-semibold">
                    <StateMark state={view.state} />
                    {view.label}
                  </p>
                  <div className="mt-2">
                    <MaintenanceActionButtons breakdownId={breakdown.id} currentStatus={breakdown.status} />
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 border-y-2 border-plate-rule py-5 text-[16px]">Aucune panne signalée.</p>
        )}
      </section>
    </div>
  );
}
