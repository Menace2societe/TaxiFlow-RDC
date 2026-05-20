import Link from "next/link";
import { Bike, CarTaxiFront, Filter, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvestorAssignDriverForm } from "@/components/investor/InvestorAssignDriverForm";
import { InvestorDeleteVehicleForm } from "@/components/investor/InvestorDeleteVehicleForm";
import { InvestorVehicleCreateModal } from "@/components/investor/InvestorVehicleCreateModal";
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

const statusLabels: Record<VehicleStatus, string> = {
  active: "En service",
  maintenance: "Maintenance",
  inactive: "Repos"
};

const statusVariant: Record<VehicleStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  maintenance: "warning",
  inactive: "neutral"
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
  if (selected === "all") {
    return vehicles;
  }
  return vehicles.filter((v) => v.status === selected);
}

export default async function InvestorFleetPage({ searchParams }: FleetPageProps) {
  const ownerId = await getCurrentUserId();
  const selectedStatus = searchParams?.status ?? "all";

  if (!ownerId) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
        <p className="text-stone-600 dark:text-stone-400">Connectez-vous pour voir votre flotte.</p>
        <Link className="btn-primary mt-4 inline-block" href={loginWithNext(ROUTES.INVESTOR_FLEET)}>
          Connexion
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

  const conflictVehicle =
    searchParams?.reassign === "1" && searchParams?.conflict_vehicle
      ? vehicles.find((v) => v.id === searchParams.conflict_vehicle)
      : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Actifs suivis · Kinshasa</p>
          <h1 className="mt-1 text-3xl font-semibold">Gestion de la Flotte</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Solde mois courant : objectif journalier × {daysInMonth} jours − versements (CDF normalises).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InvestorVehicleCreateModal />
        </div>
      </header>

      {searchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.created ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Vehicule ajoute.
        </p>
      ) : null}
      {searchParams?.deleted ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Vehicule supprime.
        </p>
      ) : null}
      {searchParams?.assigned ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Chauffeur mis a jour.
        </p>
      ) : null}

      {conflictVehicle && searchParams?.target_vehicle && searchParams?.driver ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">Reassignation en attente</p>
          <p className="mt-1">
            Le chauffeur selectionne est encore sur « {conflictVehicle.label} » ({conflictVehicle.plate_number}). Confirmez
            pour liberer l&apos;ancien vehicule et assigner ici.
          </p>
          <form action={assignDriverToVehicle} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="vehicle_id" value={searchParams.target_vehicle} />
            <input type="hidden" name="driver_id" value={searchParams.driver} />
            <input type="hidden" name="confirm_reassign" value="1" />
            <button type="submit" className="btn-primary min-h-10 px-4">
              Confirmer la reassignation
            </button>
            <Link href={ROUTES.INVESTOR_FLEET} className="btn-secondary min-h-10 inline-flex items-center px-4">
              Annuler
            </Link>
          </form>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["all", "active", "maintenance", "inactive"] as const).map((status) => (
          <Link
            key={status}
            href={status === "all" ? ROUTES.INVESTOR_FLEET : `${ROUTES.INVESTOR_FLEET}?status=${status}`}
            className={`btn-secondary min-h-10 px-3 ${selectedStatus === status ? "border-palm text-palm dark:text-emerald-300" : ""}`}
          >
            <Filter size={16} aria-hidden className="inline" />{" "}
            {status === "all" ? "Tous" : statusLabels[status]}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <CarTaxiFront className="text-palm dark:text-emerald-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Vehicules</p>
            <p className="mt-1 text-2xl font-semibold">{vehicles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CarTaxiFront className="text-river dark:text-cyan-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">En service</p>
            <p className="mt-1 text-2xl font-semibold">{vehicles.filter((v) => v.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Wrench className="text-copper dark:text-amber-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Pannes non resolues</p>
            <p className="mt-1 text-2xl font-semibold">{openBreakdowns}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Liste des vehicules</h2>
        </CardHeader>
        <div className="hidden overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicule</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Solde mois (CDF)</TableHead>
                <TableHead>Assignation</TableHead>
                <TableHead className="w-24">Suppr.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((vehicle) => {
                const Icon = vehicle.type === "moto" ? Bike : CarTaxiFront;
                const realized = revenueByVehicle.get(vehicle.id) ?? 0;
                const targetMonth = vehicle.target_daily_revenue * daysInMonth;
                const balance = Math.max(0, targetMonth - realized);

                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-palm/10 p-2 text-palm dark:text-emerald-300">
                          <Icon size={18} aria-hidden />
                        </span>
                        <div>
                          <p className="font-semibold">{vehicle.label}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{vehicle.plate_number}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.driver_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[vehicle.status] ?? "neutral"}>{statusLabels[vehicle.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{formatCDF(balance)}</span>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Realise {formatCDF(realized)} / cible {formatCDF(targetMonth)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <InvestorAssignDriverForm
                        vehicleId={vehicle.id}
                        drivers={drivers}
                        vehicles={vehicles}
                        currentDriverId={vehicle.driver_id}
                      />
                    </TableCell>
                    <TableCell>
                      <InvestorDeleteVehicleForm vehicleId={vehicle.id} label={vehicle.label} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800 lg:hidden">
          {filtered.map((vehicle) => {
            const Icon = vehicle.type === "moto" ? Bike : CarTaxiFront;
            const realized = revenueByVehicle.get(vehicle.id) ?? 0;
            const targetMonth = vehicle.target_daily_revenue * daysInMonth;
            const balance = Math.max(0, targetMonth - realized);

            return (
              <article className="p-4" key={vehicle.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-palm/10 p-2 text-palm dark:text-emerald-300">
                      <Icon size={18} aria-hidden />
                    </span>
                    <div>
                      <h2 className="font-semibold">{vehicle.label}</h2>
                      <p className="text-sm text-stone-500 dark:text-stone-400">{vehicle.plate_number}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant[vehicle.status] ?? "neutral"}>{statusLabels[vehicle.status]}</Badge>
                </div>
                <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
                  Solde mois : <span className="font-semibold">{formatCDF(balance)}</span>
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Realise {formatCDF(realized)} · Cible {formatCDF(targetMonth)}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-stone-500 dark:text-stone-400">Chauffeur : </span>
                  {vehicle.driver_name ?? "—"}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <p className="mb-1 text-xs font-medium text-stone-500 dark:text-stone-400">Assignation</p>
                    <InvestorAssignDriverForm
                      vehicleId={vehicle.id}
                      drivers={drivers}
                      vehicles={vehicles}
                      currentDriverId={vehicle.driver_id}
                    />
                  </div>
                  <InvestorDeleteVehicleForm vehicleId={vehicle.id} label={vehicle.label} />
                </div>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone-500 dark:text-stone-400">Aucun vehicule dans cette vue.</p>
        ) : null}
      </Card>
    </div>
  );
}
