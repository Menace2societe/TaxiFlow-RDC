import { CalendarDays, ReceiptText } from "lucide-react";
import { DailyEntryForm } from "@/components/DailyEntryForm";
import { getCurrentUserId, getOwnerEntries, getOwnerVehicles } from "@/lib/dashboard/data";
import { formatCDF } from "@/lib/utils/currency";

type EntriesPageProps = {
  searchParams?: { created?: string; error?: string };
};

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const ownerId = await getCurrentUserId();
  const [vehicles, entries] = ownerId ? await Promise.all([getOwnerVehicles(ownerId), getOwnerEntries(ownerId)]) : [[], []];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Journal des recettes</p>
          <h1 className="mt-1 text-3xl font-semibold">Recettes journalieres</h1>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
          <CalendarDays size={18} aria-hidden />
          {entries.length} operations recentes
        </div>
      </header>

      {searchParams?.created ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Recette enregistree.</p> : null}
      {searchParams?.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}

      <DailyEntryForm vehicles={vehicles} />

      <section className="rounded-lg border border-stone-200 bg-white shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ReceiptText size={20} aria-hidden />
            Dernieres recettes
          </h2>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500 dark:bg-stone-900 dark:text-stone-400">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Vehicule</th>
                <th className="px-5 py-3 font-medium">Montant</th>
                <th className="px-5 py-3 font-medium">Km</th>
                <th className="px-5 py-3 font-medium">CDF normalise</th>
                <th className="px-5 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {entries.map((entry) => {
                const vehicle = vehicles.find((item) => item.id === entry.vehicle_id);

                return (
                  <tr key={entry.id}>
                    <td className="px-5 py-3">{entry.entry_date}</td>
                    <td className="px-5 py-3">{vehicle?.label ?? "Vehicule"}</td>
                    <td className="px-5 py-3 font-semibold">{entry.amount.toLocaleString("fr-CD")} {entry.currency}</td>
                    <td className="px-5 py-3">{entry.mileage_km.toLocaleString("fr-CD")}</td>
                    <td className="px-5 py-3">{formatCDF(entry.revenue_cdf)}</td>
                    <td className="px-5 py-3 text-stone-500 dark:text-stone-400">{entry.notes ?? "-"}</td>
                  </tr>
                );
              })}
              {entries.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-stone-500" colSpan={6}>
                    Aucune recette pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800 md:hidden">
          {entries.map((entry) => {
            const vehicle = vehicles.find((item) => item.id === entry.vehicle_id);

            return (
              <article className="p-4" key={entry.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{vehicle?.label ?? "Vehicule"}</p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">{entry.entry_date}</p>
                  </div>
                  <p className="text-right font-semibold">{entry.amount.toLocaleString("fr-CD")} {entry.currency}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <span className="rounded-md bg-stone-50 px-3 py-2 dark:bg-stone-900">{entry.mileage_km.toLocaleString("fr-CD")} km</span>
                  <span className="rounded-md bg-stone-50 px-3 py-2 dark:bg-stone-900">{formatCDF(entry.revenue_cdf)}</span>
                </div>
                {entry.notes ? <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{entry.notes}</p> : null}
              </article>
            );
          })}
          {entries.length === 0 ? <p className="px-5 py-8 text-center text-sm text-stone-500">Aucune recette pour le moment.</p> : null}
        </div>
      </section>
    </div>
  );
}
