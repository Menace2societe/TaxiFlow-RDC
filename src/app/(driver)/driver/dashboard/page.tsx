import { Bike, ClipboardCheck, Gauge } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { formatCDF } from "@/lib/utils/currency";

export default async function DriverDashboardPage() {
  const profileRaw = await getCurrentProfile();
  const profile = profileRaw as any;
  const supabase = await createClient();
  const { data: entries } = profile
    ? await supabase
        .from("daily_entries")
        .select("id,entry_date,revenue_cdf,amount,currency,mileage_km,notes")
        .eq("driver_id", profile.id)
        .order("entry_date", { ascending: false })
        .limit(10)
    : { data: [] };

  const total = (entries ?? []).reduce((sum, entry) => sum + entry.revenue_cdf, 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Portail chauffeur</p>
        <h1 className="mt-1 text-3xl font-semibold">Mes Recettes</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <Gauge className="text-palm dark:text-emerald-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Total recent</p>
          <p className="mt-1 text-2xl font-semibold">{formatCDF(total)}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <ClipboardCheck className="text-river dark:text-cyan-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Declarations</p>
          <p className="mt-1 text-2xl font-semibold">{entries?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <Bike className="text-copper dark:text-amber-300" size={22} aria-hidden />
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Statut</p>
          <p className="mt-1 text-2xl font-semibold">Actif</p>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="text-lg font-semibold">Dernieres declarations</h2>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {(entries ?? []).map((entry) => (
            <div className="flex flex-col justify-between gap-2 px-5 py-4 md:flex-row md:items-center" key={entry.id}>
              <div>
                <p className="font-medium">{entry.entry_date}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {entry.amount.toLocaleString("fr-CD")} {entry.currency} · {entry.mileage_km.toLocaleString("fr-CD")} km
                </p>
              </div>
              <p className="font-semibold">{formatCDF(entry.revenue_cdf)}</p>
            </div>
          ))}
          {entries?.length === 0 ? <p className="px-5 py-8 text-center text-sm text-stone-500">Aucune recette affectee a votre profil.</p> : null}
        </div>
      </section>
    </div>
  );
}
