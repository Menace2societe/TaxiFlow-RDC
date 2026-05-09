import { Landmark, Percent, WalletCards } from "lucide-react";
import { RevenueChart } from "@/components/RevenueChart";
import { entriesByDate, getCurrentUserId, getOwnerEntries, getOwnerVehicles, summarize } from "@/lib/dashboard/data";
import { formatCDF } from "@/lib/utils/currency";

export default async function InvestorDashboardPage() {
  const ownerId = await getCurrentUserId();
  const [vehicles, entries] = ownerId ? await Promise.all([getOwnerVehicles(ownerId), getOwnerEntries(ownerId)]) : [[], []];
  const stats = summarize(entries, vehicles);
  const roi = stats.target ? Math.round((stats.netRevenue / stats.target) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Portail investisseur</p>
        <h1 className="mt-1 text-3xl font-semibold">Etat de la Flotte</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <WalletCards className="text-palm dark:text-emerald-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Cash net</p>
          <p className="mt-1 text-2xl font-semibold">{formatCDF(stats.netRevenue)}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <Percent className="text-river dark:text-cyan-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Atteinte objectif</p>
          <p className="mt-1 text-2xl font-semibold">{roi}%</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <Landmark className="text-copper dark:text-amber-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Actifs suivis</p>
          <p className="mt-1 text-2xl font-semibold">{stats.totalVehicles}</p>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <h2 className="text-lg font-semibold">Flux recents</h2>
        <RevenueChart data={entriesByDate(entries)} />
      </section>
    </div>
  );
}
