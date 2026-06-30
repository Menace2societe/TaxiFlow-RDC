import { Activity, Banknote, CarTaxiFront, TrendingUp } from "lucide-react";
import { RevenueChart } from "@/components/RevenueChart";
import { StatCard } from "@/components/StatCard";
import { VehicleMixChart } from "@/components/VehicleMixChart";
import { entriesByDate, getCurrentUserId, getOwnerEntries, getOwnerVehicles, summarize, vehicleMix } from "@/lib/dashboard/data";
import { formatCDF } from "@/lib/utils/currency";

export default async function OverviewPage() {
  const ownerId = await getCurrentUserId();
  const [vehicles, entries] = ownerId ? await Promise.all([getOwnerVehicles(ownerId), getOwnerEntries(ownerId)]) : [[], []];
  const stats = summarize(entries, vehicles);
  const chartData = entriesByDate(entries);
  const mixData = vehicleMix(vehicles);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-300">Kinshasa operations</p>
        <h1 className="mt-1 text-3xl font-semibold">Vue generale</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenus bruts" value={formatCDF(stats.totalRevenue)} helper="Sur les 60 dernieres entrees" icon={Banknote} />
        <StatCard label="Revenus nets" value={formatCDF(stats.netRevenue)} helper={`${formatCDF(stats.totalCosts)} de couts declares`} icon={TrendingUp} />
        <StatCard label="Flotte active" value={`${stats.activeVehicles}/${stats.totalVehicles}`} helper="Vehicules prets a produire" icon={CarTaxiFront} />
        <StatCard label="Objectif journalier" value={formatCDF(stats.target)} helper="Somme des objectifs de la flotte" icon={Activity} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-white/10 bg-stone-950 p-5 text-stone-100 shadow-soft">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Revenus vs couts</h2>
            <p className="text-sm text-stone-400">Agregation par date, calculee cote serveur.</p>
          </div>
          <RevenueChart data={chartData} />
        </div>
        <div className="rounded-lg border border-white/10 bg-stone-950 p-5 text-stone-100 shadow-soft">
          <h2 className="text-lg font-semibold">Composition flotte</h2>
          {mixData.length > 0 ? <VehicleMixChart data={mixData} /> : <p className="mt-6 text-sm text-stone-400">Aucun vehicule enregistre.</p>}
          <div className="mt-3 space-y-2 text-sm">
            {mixData.map((item) => (
              <div className="flex items-center justify-between" key={item.name}>
                <span className="text-stone-300">{item.name}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
