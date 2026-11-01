import Link from "next/link";
import { AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";
import { AssignDriverPanel } from "@/components/investor/AssignDriverPanel";
import { InvestorDeleteVehicleForm } from "@/components/investor/InvestorDeleteVehicleForm";
import { InvestorDriverTeamPanel } from "@/components/investor/InvestorDriverTeamPanel";
import { InvestorVehicleCreateModal } from "@/components/investor/InvestorVehicleCreateModal";
import { LicensePlate, StateMark, vehicleStatusLabels, type DayState } from "@/components/driver/plate";
import { MaintenanceActionButtons } from "@/components/shared/MaintenanceActionButtons";
import { VehicleStatusControls } from "@/components/VehicleStatusControls";
import { assignDriverToVehicle } from "@/actions/investor-fleet";
import {
  getCurrentUserId,
  getDriverProfiles,
  getOwnerNonResolvedBreakdownsCount,
  getOwnerEntriesForDateRange,
  getOwnerVehicles,
  getOwnerActiveBreakdownsByVehicle,
  revenueCdfByVehicle,
  type DashboardVehicle
} from "@/lib/dashboard/data";
import { kinshasaCurrentMonthRange } from "@/lib/time/kinshasa";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";
import { formatCDF } from "@/lib/utils/currency";
import type { VehicleStatus } from "@/lib/supabase/types";

/** Un marqueur par état du véhicule, comme dans l'espace chauffeur. */
const statusState: Record<VehicleStatus, DayState> = {
  "en service": "ok",
  maintenance: "wait",
  repos: "none"
};

function VehicleStatusLine({ status }: { status: VehicleStatus | string }) {
  const known = status in statusState;
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <StateMark state={known ? statusState[status as VehicleStatus] : "none"} />
      {known ? vehicleStatusLabels[status as VehicleStatus] : "Statut inconnu"}
    </span>
  );
}

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
      <div className="mx-auto max-w-xl rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
        <h1 className="font-plate text-[26px] font-bold leading-tight">Ma flotte</h1>
        <p className="mt-1 text-[16px]">Connectez-vous pour voir votre flotte.</p>
        <Link className="btn-primary mt-4 w-full no-underline" href={loginWithNext(ROUTES.INVESTOR_FLEET)}>
          Se connecter
        </Link>
      </div>
    );
  }

  const { startDate, endDate, daysInMonth } = kinshasaCurrentMonthRange();
  const [vehicles, monthEntries, drivers, openBreakdowns, activeBreakdownByVehicle] = await Promise.all([
    getOwnerVehicles(ownerId),
    getOwnerEntriesForDateRange(ownerId, startDate, endDate),
    getDriverProfiles(),
    getOwnerNonResolvedBreakdownsCount(ownerId),
    getOwnerActiveBreakdownsByVehicle(ownerId)
  ]);

  const revenueByVehicle = revenueCdfByVehicle(monthEntries);
  const filtered = filterByStatus(vehicles, selectedStatus);

  const activeCount = vehicles.filter((v) => v.status === "en service").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;
  const restCount = vehicles.filter((v) => v.status === "repos").length;
  const assignedCount = vehicles.filter((v) => v.driver_id !== null).length;
  const monthRevenue = Array.from(revenueByVehicle.values()).reduce((a, b) => a + b, 0);
  const assignedDriverIds = vehicles
    .map((vehicle) => vehicle.driver_id)
    .filter((driverId): driverId is string => Boolean(driverId));

  // Une seule échelle pour toutes les barres de recettes : le plus grand objectif ou la plus grande recette.
  const revenueScale = Math.max(
    1,
    ...filtered.map((v) => v.target_daily_revenue * daysInMonth),
    ...filtered.map((v) => revenueByVehicle.get(v.id) ?? 0)
  );

  const conflictVehicle =
    searchParams?.reassign === "1" && searchParams?.conflict_vehicle
      ? vehicles.find((v) => v.id === searchParams.conflict_vehicle)
      : null;
  const showReassign = Boolean(conflictVehicle && searchParams?.target_vehicle && searchParams?.driver);

  const filterLinks: Array<{ key: string; label: string }> = [
    { key: "all", label: "Tous" },
    { key: "en service", label: "En service" },
    { key: "maintenance", label: "En réparation" },
    { key: "repos", label: "Au repos" }
  ];

  return (
    <div className="pb-6">
      {/* ─── En-tête ─── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-plate text-[30px] font-bold leading-tight">Ma flotte</h1>
          <p className="mt-1 text-[16px]">
            Recettes enregistrées ce mois, comparées au versement attendu × {daysInMonth} jours.
          </p>
        </div>
        {/* Pendant une réassignation, le bouton bleu est « Confirmer » : celui-ci passe en blanc. */}
        <InvestorVehicleCreateModal variant={showReassign ? "secondary" : "primary"} />
      </header>

      {/* ─── Messages ─── */}
      {searchParams?.error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border-2 border-plate-bad bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-bad">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.created ? (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border-2 border-plate-ok bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-ok">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          Véhicule ajouté à votre flotte.
        </p>
      ) : null}
      {searchParams?.deleted ? (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border-2 border-plate-ok bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-ok">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          Véhicule supprimé.
        </p>
      ) : null}
      {searchParams?.assigned ? (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border-2 border-plate-ok bg-plate-white px-4 py-3 text-[15px] font-semibold text-plate-ok">
          <UserCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
          Chauffeur assigné.
        </p>
      ) : null}

      {/* ─── Confirmation de réassignation : la seule chose à faire maintenant ─── */}
      {showReassign && conflictVehicle ? (
        <section aria-labelledby="reassign-title" className="mt-5 rounded-2xl bg-plate-vignette px-5 pb-5 pt-4">
          <h2 id="reassign-title" className="font-plate text-[26px] font-bold leading-tight">
            Réassignation à confirmer
          </h2>
          <p className="mt-1 text-[16px]">
            Ce chauffeur conduit déjà <b>{conflictVehicle.label}</b> ({conflictVehicle.plate_number}). Confirmez pour
            libérer l&apos;ancien véhicule et le lui confier ici.
          </p>
          <form action={assignDriverToVehicle} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="vehicle_id" value={searchParams?.target_vehicle} />
            <input type="hidden" name="driver_id" value={searchParams?.driver} />
            <input type="hidden" name="confirm_reassign" value="1" />
            <button type="submit" className="btn-primary px-6">
              Confirmer la réassignation
            </button>
            <Link href={ROUTES.INVESTOR_FLEET} className="btn-secondary px-6 no-underline">
              Annuler
            </Link>
          </form>
        </section>
      ) : null}

      {/* ─── Résumé : une ligne, pas de tuiles ─── */}
      <section aria-label="Résumé de la flotte" className="mt-6 border-y-2 border-plate-rule py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="text-[16px]">
            <b className="font-plate text-[21px]">{vehicles.length}</b> véhicule{vehicles.length > 1 ? "s" : ""} ·{" "}
            <b>{assignedCount}</b> avec chauffeur
          </p>
          <p className="text-[16px]">
            Recettes du mois : <b className="font-plate text-[21px]">{formatCDF(monthRevenue)}</b>
          </p>
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[15px] font-semibold">
          <li className="flex items-center gap-2">
            <StateMark state="ok" />
            {activeCount} en service
          </li>
          <li className="flex items-center gap-2">
            <StateMark state="wait" />
            {maintenanceCount} en réparation
          </li>
          <li className="flex items-center gap-2">
            <StateMark state="none" />
            {restCount} au repos
          </li>
          <li className={cn("flex items-center gap-2", openBreakdowns > 0 && "text-plate-bad")}>
            <StateMark state={openBreakdowns > 0 ? "bad" : "ok"} />
            {openBreakdowns} panne{openBreakdowns > 1 ? "s" : ""} non résolue{openBreakdowns > 1 ? "s" : ""}
          </li>
        </ul>
      </section>

      {/* ─── Véhicules ─── */}
      <section aria-labelledby="vehicles-title" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="vehicles-title" className="font-plate text-[24px] font-bold">
            Véhicules
          </h2>
          <p className="text-[15px] font-medium">
            {filtered.length} véhicule{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Filtres : l'état choisi est rempli d'encre, comme les boutons d'état */}
        <nav aria-label="Filtrer par état" className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {filterLinks.map(({ key, label }) => {
            const active = selectedStatus === key;
            return (
              <Link
                key={key}
                href={key === "all" ? ROUTES.INVESTOR_FLEET : `${ROUTES.INVESTOR_FLEET}?status=${key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-plate-ink px-4 text-[15px] font-bold no-underline transition-colors",
                  active ? "bg-plate-ink text-plate-white" : "bg-plate-white text-plate-ink hover:bg-plate-ground"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {filtered.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-dashed border-plate-ink px-5 py-6">
            <p className="text-[17px] font-bold">Aucun véhicule dans cette vue</p>
            <p className="mt-1 text-[16px]">Ajoutez un véhicule ou changez de filtre.</p>
            <div className="mt-4">
              <InvestorVehicleCreateModal variant="secondary" />
            </div>
          </div>
        ) : (
          <ol className="mt-4 border-b-2 border-plate-rule">
            {filtered.map((vehicle) => {
              const realized = revenueByVehicle.get(vehicle.id) ?? 0;
              const targetMonth = vehicle.target_daily_revenue * daysInMonth;
              const breakdown = vehicle.status === "maintenance" ? activeBreakdownByVehicle.get(vehicle.id) : undefined;

              return (
                <li
                  key={vehicle.id}
                  className="grid gap-x-8 gap-y-5 border-t-2 border-plate-rule py-5 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)_minmax(0,300px)]"
                >
                  {/* Identité : la plaque d'abord */}
                  <div className="min-w-0">
                    <div className="max-w-[250px]">
                      <LicensePlate plateNumber={vehicle.plate_number} size="sm" />
                    </div>
                    <p className="mt-2 text-[15px]">
                      {vehicle.label} · <b>{vehicle.type === "moto" ? "moto-taxi" : "taxi"}</b>
                    </p>
                    <p className="mt-1 text-[15px]">
                      <VehicleStatusLine status={vehicle.status} />
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[15px]">
                      <StateMark state={vehicle.driver_name ? "ok" : "none"} />
                      {vehicle.driver_name ? (
                        <span>
                          Chauffeur : <b>{vehicle.driver_name}</b>
                        </span>
                      ) : (
                        "Sans chauffeur"
                      )}
                    </p>
                  </div>

                  {/* Recettes du mois et état */}
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-semibold">Recettes du mois</p>
                      <p className="font-plate text-[21px] font-bold">{formatCDF(realized)}</p>
                    </div>
                    <div className="relative mt-1.5 h-3 rounded-sm bg-plate-rule/60" aria-hidden>
                      <span
                        className="block h-3 rounded-sm bg-plate-ink"
                        style={{ width: `${Math.round((realized / revenueScale) * 100)}%` }}
                      />
                      {targetMonth > 0 ? (
                        <span
                          className="absolute -top-1 h-5 border-l-2 border-dashed border-plate-ink"
                          style={{ left: `${Math.min(100, (targetMonth / revenueScale) * 100)}%` }}
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-[14px] font-semibold">
                      Objectif du mois (pointillé) : {formatCDF(targetMonth)}
                    </p>

                    <p className="mt-4 text-[15px] font-semibold">État du véhicule</p>
                    <div className="mt-1.5">
                      <VehicleStatusControls vehicleId={vehicle.id} currentStatus={vehicle.status} compact />
                    </div>
                    {breakdown ? (
                      <div className="mt-3">
                        <MaintenanceActionButtons breakdownId={breakdown.id} currentStatus={breakdown.status} />
                      </div>
                    ) : null}
                  </div>

                  {/* Chauffeur et suppression */}
                  <div className="min-w-0">
                    <AssignDriverPanel
                      vehicleId={vehicle.id}
                      vehicleLabel={vehicle.label}
                      drivers={drivers}
                      currentDriverId={vehicle.driver_id}
                      currentDriverName={vehicle.driver_name}
                      unavailableDriverIds={assignedDriverIds}
                    />
                    <div className="mt-4 border-t-2 border-plate-rule pt-4">
                      <InvestorDeleteVehicleForm vehicleId={vehicle.id} label={vehicle.label} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ─── Équipe de chauffeurs ─── */}
      <section aria-labelledby="team-title" className="mt-10">
        <InvestorDriverTeamPanel vehicles={vehicles} />
      </section>
    </div>
  );
}
