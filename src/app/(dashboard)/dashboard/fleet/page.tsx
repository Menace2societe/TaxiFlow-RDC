import { Bike, CarTaxiFront, CircleGauge, Power, UserRound } from "lucide-react";
import { toggleVehicleStatus } from "@/actions/vehicles";
import { getCurrentUserId, getOwnerVehicles } from "@/lib/dashboard/data";
import { formatCDF } from "@/lib/utils/currency";

type FleetPageProps = {
  searchParams?: { updated?: string; error?: string };
};

const statusLabels = {
  active: "En service",
  inactive: "Repos",
  maintenance: "Maintenance"
};

export default async function FleetPage({ searchParams }: FleetPageProps) {
  const ownerId = await getCurrentUserId();
  const vehicles = ownerId ? await getOwnerVehicles(ownerId) : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Kinshasa fleet</p>
          <h1 className="mt-1 text-3xl font-semibold">Gestion de flotte</h1>
        </div>
        <p className="rounded-md border border-white/10 bg-stone-950 px-3 py-2 text-sm font-medium text-stone-300 shadow-soft">
          {vehicles.length} taxis et motos
        </p>
      </header>

      {searchParams?.updated ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">Statut du vehicule mis a jour.</p> : null}
      {searchParams?.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{searchParams.error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((vehicle) => {
          const Icon = vehicle.type === "moto" ? Bike : CarTaxiFront;
          const isActive = vehicle.status === "active";

          return (
            <article key={vehicle.id} className="rounded-lg border border-white/10 bg-stone-950 p-4 text-stone-100 shadow-soft md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{vehicle.label}</h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Plaque {vehicle.plate_number}</p>
                </div>
                <span className="rounded-md bg-river/10 p-2 text-river dark:text-cyan-300">
                  <Icon size={20} aria-hidden />
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <UserRound size={16} aria-hidden />
                    Chauffeur
                  </span>
                  <span className="text-right font-semibold">{vehicle.driver_name ?? "Non assigne"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <CircleGauge size={16} aria-hidden />
                    Objectif
                  </span>
                  <span className="font-semibold">{formatCDF(vehicle.target_daily_revenue)}</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className={`rounded-md px-3 py-2 text-sm font-semibold ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                  {statusLabels[vehicle.status]}
                </span>
                <form action={toggleVehicleStatus}>
                  <input type="hidden" name="vehicle_id" value={vehicle.id} />
                  <input type="hidden" name="current_status" value={vehicle.status} />
                  <button className="btn-secondary min-h-10 px-3" type="submit">
                    <Power size={17} aria-hidden />
                    {isActive ? "Repos" : "Service"}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
        {vehicles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950 p-8 text-center text-sm text-stone-400 md:col-span-2 xl:col-span-3">
            Aucun taxi ou moto n'est encore enregistre.
          </div>
        ) : null}
      </section>
    </div>
  );
}
