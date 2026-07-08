import Link from "next/link";
import {
  Bike,
  CarTaxiFront,
  CheckCircle2,
  Filter,
  PlusCircle,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
  AlertTriangle,
  CirclePause
} from "lucide-react";
import { AssignDriverPanel } from "@/components/investor/AssignDriverPanel";
import { InvestorDeleteVehicleForm } from "@/components/investor/InvestorDeleteVehicleForm";
import { InvestorVehicleCreateModal } from "@/components/investor/InvestorVehicleCreateModal";
import { VehicleStatusControls } from "@/components/VehicleStatusControls";
import { assignDriverToVehicle } from "@/actions/investor-fleet";
import {
  getCurrentUserId,
  getDriverProfiles,
  getOwnerNonResolvedBreakdownsCount,
  getOwnerEntriesForDateRange,
  getOwnerVehicles,
  revenueCdfByVehicle,
  type DashboardVehicle
} from "@/lib/dashboard/data";
import { kinshasaCurrentMonthRange } from "@/lib/time/kinshasa";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { formatCDF } from "@/lib/utils/currency";
import type { VehicleStatus } from "@/lib/supabase/types";

const statusConfig: Record<
  VehicleStatus,
  { label: string; badgeClass: string; dotClass: string; icon: typeof CheckCircle2 }
> = {
  active: {
    label: "En service",
    badgeClass: "badge badge-green",
    dotClass: "bg-emerald-400",
    icon: CheckCircle2
  },
  maintenance: {
    label: "Maintenance",
    badgeClass: "badge badge-amber",
    dotClass: "bg-amber-400",
    icon: Wrench
  },
  inactive: {
    label: "Au repos",
    badgeClass: "badge badge-neutral",
    dotClass: "bg-neutral-400",
    icon: CirclePause
  }
};

type FleetPageProps = {
  searchParams?: {
    status?: string;
    error?: string;
    created?: string;
    deleted?: string;
    assigned?: string;
    reassign?: string;
    conflict_vehicle?: string;
    target_vehicle?: string;
    driver?: string;
  };
};

function filterByStatus(vehicles: DashboardVehicle[], selected: string) {
  if (selected === "all") return vehicles;
  return vehicles.filter((v) => v.status === selected);
}

export default async function InvestorFleetPage({ searchParams }: FleetPageProps) {
  const ownerId = await getCurrentUserId();
  const selectedStatus = searchParams?.status ?? "all";

  if (!ownerId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-10 text-center">
        <CarTaxiFront size={36} className="text-neutral-600" />
        <p className="text-neutral-400">Connectez-vous pour voir votre flotte.</p>
        <Link className="btn-primary" href={loginWithNext(ROUTES.INVESTOR_FLEET)}>
          Se connecter
        </Link>
      </div>
    );
  }

  const { startDate, endDate, daysInMonth } = kinshasaCurrentMonthRange();
  const [vehicles, monthEntries, drivers, openBreakdowns] = await Promise.all([
    getOwnerVehicles(ownerId),
    getOwnerEntriesForDateRange(ownerId, startDate, endDate),
    getDriverProfiles(),
    getOwnerNonResolvedBreakdownsCount(ownerId)
  ]);

  const revenueByVehicle = revenueCdfByVehicle(monthEntries);
  const filtered = filterByStatus(vehicles, selectedStatus);

  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;
  const assignedCount = vehicles.filter((v) => v.driver_id !== null).length;
  const assignedDriverIds = vehicles
    .map((vehicle) => vehicle.driver_id)
    .filter((driverId): driverId is string => Boolean(driverId));

  const conflictVehicle =
    searchParams?.reassign === "1" && searchParams?.conflict_vehicle
      ? vehicles.find((v) => v.id === searchParams.conflict_vehicle)
      : null;

  const filterLinks: Array<{ key: string; label: string }> = [
    { key: "all", label: "Tous" },
    { key: "active", label: "En service" },
    { key: "maintenance", label: "Maintenance" },
    { key: "inactive", label: "Au repos" }
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ─── Hero Header ─────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/20 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.07)_0%,_transparent_60%)]" />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Investisseur · Kinshasa
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Gestion de la Flotte
            </h1>
            <p className="mt-1.5 text-sm text-neutral-400">
              Objectif journalier × {daysInMonth} jours — versements enregistrés ce mois.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <InvestorVehicleCreateModal />
          </div>
        </div>
      </header>

      {/* ─── Alertes ─────────────────────────────────────────────────────────────── */}
      {searchParams?.error && (
        <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={15} className="shrink-0" />
          {searchParams.error}
        </div>
      )}
      {searchParams?.created && (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={15} className="shrink-0" />
          Véhicule ajouté à votre flotte.
        </div>
      )}
      {searchParams?.deleted && (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={15} className="shrink-0" />
          Véhicule supprimé.
        </div>
      )}
      {searchParams?.assigned && (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <UserCheck size={15} className="shrink-0" />
          Chauffeur assigné avec succès.
        </div>
      )}

      {/* ─── Confirmation de réassignation ───────────────────────────────────────── */}
      {conflictVehicle && searchParams?.target_vehicle && searchParams?.driver && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-lg bg-amber-500/15 p-2">
              <AlertTriangle className="text-amber-400" size={18} />
            </div>
            <div>
              <p className="font-semibold text-amber-100">Réassignation en attente</p>
              <p className="mt-1 text-sm text-amber-300/80">
                Ce chauffeur est déjà sur «{conflictVehicle.label}» ({conflictVehicle.plate_number}).
                Confirmez pour libérer l&apos;ancien véhicule et assigner ici.
              </p>
            </div>
          </div>
          <form action={assignDriverToVehicle} className="flex flex-wrap gap-2">
            <input type="hidden" name="vehicle_id" value={searchParams.target_vehicle} />
            <input type="hidden" name="driver_id" value={searchParams.driver} />
            <input type="hidden" name="confirm_reassign" value="1" />
            <button type="submit" className="btn-primary min-h-10 px-5">
              Confirmer la réassignation
            </button>
            <Link href={ROUTES.INVESTOR_FLEET} className="btn-secondary min-h-10 inline-flex items-center px-5">
              Annuler
            </Link>
          </form>
        </div>
      )}

      {/* ─── KPI Cards ───────────────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5 stat-glow-emerald">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 w-fit">
            <CarTaxiFront className="text-emerald-400" size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">Total véhicules</p>
          <p className="mt-1 text-3xl font-bold text-white">{vehicles.length}</p>
        </div>
        <div className="card p-5 stat-glow-emerald">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 w-fit">
            <CheckCircle2 className="text-emerald-400" size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">En service</p>
          <p className="mt-1 text-3xl font-bold text-white">{activeCount}</p>
          <p className="mt-1 text-xs text-neutral-600">/{vehicles.length} total</p>
        </div>
        <div className={`card p-5 ${maintenanceCount > 0 ? "stat-glow-amber" : ""}`}>
          <div className={`rounded-lg p-2.5 w-fit ${maintenanceCount > 0 ? "bg-amber-500/10" : "bg-neutral-800"}`}>
            <Wrench className={maintenanceCount > 0 ? "text-amber-400" : "text-neutral-600"} size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">En maintenance</p>
          <p className={`mt-1 text-3xl font-bold ${maintenanceCount > 0 ? "text-amber-300" : "text-white"}`}>
            {maintenanceCount}
          </p>
        </div>
        <div className={`card p-5 ${openBreakdowns > 0 ? "stat-glow-red" : ""}`}>
          <div className={`rounded-lg p-2.5 w-fit ${openBreakdowns > 0 ? "bg-red-500/10" : "bg-neutral-800"}`}>
            <AlertTriangle className={openBreakdowns > 0 ? "text-red-400" : "text-neutral-600"} size={20} aria-hidden />
          </div>
          <p className="mt-4 text-sm text-neutral-400">Pannes non résolues</p>
          <p className={`mt-1 text-3xl font-bold ${openBreakdowns > 0 ? "text-red-300" : "text-white"}`}>
            {openBreakdowns}
          </p>
        </div>
      </section>

      {/* ─── Stats secondaires ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 px-5 py-3">
        <div className="flex items-center gap-1.5 text-sm text-neutral-400">
          <Users size={14} className="text-emerald-500" />
          <span className="font-semibold text-white">{assignedCount}</span> / {vehicles.length} véhicule(s) avec chauffeur
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-sm text-neutral-400">
          <TrendingUp size={14} className="text-emerald-500" />
          <span className="text-xs">Recettes mois :</span>
          <span className="font-semibold text-white">
            {formatCDF(Array.from(revenueByVehicle.values()).reduce((a, b) => a + b, 0))}
          </span>
        </div>
      </div>

      {/* ─── Filtres ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {filterLinks.map(({ key, label }) => (
          <Link
            key={key}
            href={key === "all" ? ROUTES.INVESTOR_FLEET : `${ROUTES.INVESTOR_FLEET}?status=${key}`}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
              selectedStatus === key
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                : "border-neutral-700 bg-neutral-800/60 text-neutral-400 hover:border-neutral-600 hover:text-white"
            ].join(" ")}
          >
            <Filter size={13} aria-hidden />
            {label}
          </Link>
        ))}
      </div>

      {/* ─── Liste vehicules ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-800 border-dashed bg-neutral-900/30 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800">
            <CarTaxiFront size={24} className="text-neutral-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-300">Aucun véhicule dans cette vue</p>
            <p className="mt-1 text-xs text-neutral-500">
              Ajoutez un véhicule ou changez le filtre actif.
            </p>
          </div>
          <InvestorVehicleCreateModal />
        </div>
      ) : (
        <>
          {/* ─── Vue desktop : tableau ────── */}
          <div className="card hidden overflow-hidden lg:block">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Liste des véhicules
              </h2>
              <span className="badge badge-neutral">{filtered.length} véhicule(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1080px]">
                <thead>
                  <tr>
                    <th>Véhicule</th>
                    <th>Chauffeur</th>
                    <th>Statut & Commandes</th>
                    <th>Recettes mois (CDF)</th>
                    <th>Assignation</th>
                    <th className="w-20">Suppr.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((vehicle) => {
                    const Icon = vehicle.type === "moto" ? Bike : CarTaxiFront;
                    const sc = statusConfig[vehicle.status];
                    const StatusIcon = sc.icon;
                    const realized = revenueByVehicle.get(vehicle.id) ?? 0;
                    const targetMonth = vehicle.target_daily_revenue * daysInMonth;
                    const progressPct =
                      targetMonth > 0
                        ? Math.min(100, Math.round((realized / targetMonth) * 100))
                        : 0;

                    return (
                      <tr key={vehicle.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                              <Icon size={18} aria-hidden />
                            </span>
                            <div>
                              <p className="font-semibold text-white">{vehicle.label}</p>
                              <p className="text-xs text-neutral-500">{vehicle.plate_number}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {vehicle.driver_name ? (
                            <div className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              <span className="text-sm text-white">{vehicle.driver_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-500">— Non assigné</span>
                          )}
                        </td>
                        <td>
                          <div className="space-y-2">
                            <span className={sc.badgeClass}>
                              <StatusIcon size={11} />
                              {sc.label}
                            </span>
                            <VehicleStatusControls
                              vehicleId={vehicle.id}
                              currentStatus={vehicle.status}
                              compact
                            />
                          </div>
                        </td>
                        <td>
                          <p className="font-bold text-white">{formatCDF(realized)}</p>
                          <p className="text-xs text-neutral-500">
                            Cible : {formatCDF(targetMonth)}
                          </p>
                          {targetMonth > 0 && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="min-w-[200px]">
                          <AssignDriverPanel
                            vehicleId={vehicle.id}
                            vehicleLabel={vehicle.label}
                            drivers={drivers}
                            currentDriverId={vehicle.driver_id}
                            currentDriverName={vehicle.driver_name}
                            unavailableDriverIds={assignedDriverIds}
                          />
                        </td>
                        <td>
                          <InvestorDeleteVehicleForm
                            vehicleId={vehicle.id}
                            label={vehicle.label}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Vue mobile : cartes ──────── */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((vehicle) => {
              const Icon = vehicle.type === "moto" ? Bike : CarTaxiFront;
              const sc = statusConfig[vehicle.status];
              const StatusIcon = sc.icon;
              const realized = revenueByVehicle.get(vehicle.id) ?? 0;
              const targetMonth = vehicle.target_daily_revenue * daysInMonth;
              const progressPct =
                targetMonth > 0
                  ? Math.min(100, Math.round((realized / targetMonth) * 100))
                  : 0;

              return (
                <div key={vehicle.id} className="card overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center gap-3 border-b border-neutral-800 p-4">
                    <span className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
                      <Icon size={20} aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{vehicle.label}</p>
                      <p className="text-xs text-neutral-500">{vehicle.plate_number}</p>
                    </div>
                    <span className={sc.badgeClass}>
                      <StatusIcon size={11} />
                      {sc.label}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Recettes */}
                    <div>
                      <p className="section-label mb-1.5">Recettes mois</p>
                      <div className="flex items-end justify-between">
                        <p className="text-xl font-bold text-white">{formatCDF(realized)}</p>
                        <p className="text-xs text-neutral-500">/ {formatCDF(targetMonth)}</p>
                      </div>
                      {targetMonth > 0 && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Statut rapide */}
                    <div>
                      <p className="section-label mb-2">Changer le statut</p>
                      <VehicleStatusControls
                        vehicleId={vehicle.id}
                        currentStatus={vehicle.status}
                        compact
                      />
                    </div>

                    {/* Assignation */}
                    <div>
                      <p className="section-label mb-2">Assignation chauffeur</p>
                      <AssignDriverPanel
                        vehicleId={vehicle.id}
                        vehicleLabel={vehicle.label}
                        drivers={drivers}
                        currentDriverId={vehicle.driver_id}
                        currentDriverName={vehicle.driver_name}
                        unavailableDriverIds={assignedDriverIds}
                      />
                    </div>

                    {/* Supprimer */}
                    <div className="pt-1 border-t border-neutral-800">
                      <InvestorDeleteVehicleForm vehicleId={vehicle.id} label={vehicle.label} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
