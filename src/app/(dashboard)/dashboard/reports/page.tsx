import { AlertTriangle, Download, Trophy, WalletCards } from "lucide-react";
import { WeeklyVehicleRevenueChart } from "@/components/WeeklyVehicleRevenueChart";
import { getCurrentUserId, getOwnerEntries, getOwnerVehicles, summarize, topDriverName, weeklyRevenueByVehicle } from "@/lib/dashboard/data";
import { formatCDF } from "@/lib/utils/currency";

export default async function ReportsPage() {
  const ownerId = await getCurrentUserId();
  const [vehicles, entries] = ownerId ? await Promise.all([getOwnerVehicles(ownerId), getOwnerEntries(ownerId)]) : [[], []];
  const stats = summarize(entries, vehicles);
  const weeklyData = weeklyRevenueByVehicle(entries, vehicles);
  const chartVehicles = Array.from(new Set(entries.map((entry) => vehicles.find((vehicle) => vehicle.id === entry.vehicle_id)?.label).filter(Boolean))) as string[];
  const maintenanceAlerts = vehicles.filter((vehicle) => vehicle.status === "maintenance").length;
  const topDriver = topDriverName(entries, vehicles);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Analyse financiere</p>
          <h1 className="mt-1 text-3xl font-semibold">Rapports</h1>
        </div>
        <button className="btn-secondary" type="button">
          <Download size={18} aria-hidden />
          Export CSV
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <WalletCards className="text-palm dark:text-emerald-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Revenu total</p>
          <p className="mt-1 text-2xl font-semibold">{formatCDF(stats.totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <Trophy className="text-river dark:text-cyan-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Top chauffeur</p>
          <p className="mt-1 text-2xl font-semibold">{topDriver}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <AlertTriangle className="text-copper dark:text-amber-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Alertes maintenance</p>
          <p className="mt-1 text-2xl font-semibold">{maintenanceAlerts}</p>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-stone-800 dark:bg-stone-950 md:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Revenus hebdomadaires par vehicule</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Calcul serveur, rendu graphique isole cote client.</p>
        </div>
        {weeklyData.length > 0 && chartVehicles.length > 0 ? (
          <WeeklyVehicleRevenueChart data={weeklyData} vehicles={chartVehicles} />
        ) : (
          <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">Pas encore assez de donnees pour afficher le graphique.</p>
        )}
      </section>
    </div>
  );
}
