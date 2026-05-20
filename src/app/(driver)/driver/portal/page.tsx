import Link from "next/link";
import { redirect } from "next/navigation";
import { CarTaxiFront, ReceiptText } from "lucide-react";
import { getCurrentUserId, getDriverAssignedVehicle, getDriverRecentEntries } from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { formatCDF } from "@/lib/utils/currency";
import { DriverBreakdownQuickForm } from "@/components/driver/DriverBreakdownQuickForm";
import { DriverVersementForm } from "@/components/driver/DriverVersementForm";

type PortalPageProps = {
  searchParams?: { error?: string; created?: string; breakdown?: string };
};

export default async function DriverPortalPage({ searchParams }: PortalPageProps) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(loginWithNext(ROUTES.DRIVER_PORTAL));
  }

  const [vehicle, recent] = await Promise.all([getDriverAssignedVehicle(userId), getDriverRecentEntries(userId, 5)]);
  const hasVehicle = Boolean(vehicle);

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <header>
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Terrain</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Portail chauffeur</h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Versements et signalement rapide, optimise pour mobile.</p>
      </header>

      {searchParams?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.created ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Versement enregistre.
        </p>
      ) : null}
      {searchParams?.breakdown ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Panne signalee. Votre vehicule est passe en maintenance cote flotte.
        </p>
      ) : null}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-palm/10 p-2 text-palm dark:text-emerald-300">
            <CarTaxiFront size={22} aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold">Mon vehicule</h2>
            {vehicle ? (
              <>
                <p className="mt-1 text-lg font-bold">{vehicle.label}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">Plaque {vehicle.plate_number}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                Aucun vehicule assigne. Contactez votre investisseur.
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ReceiptText size={20} className="text-palm dark:text-emerald-300" aria-hidden />
          Enregistrer mon versement
        </h2>
        <DriverVersementForm hasVehicle={hasVehicle} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Signaler une panne</h2>
        <DriverBreakdownQuickForm hasVehicle={hasVehicle} />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
        <h2 className="text-base font-semibold">5 derniers versements</h2>
        <ul className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          {recent.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 py-3 text-sm first:pt-0">
              <span className="text-stone-500 dark:text-stone-400">{entry.entry_date}</span>
              <span className="font-semibold">
                {entry.amount.toLocaleString("fr-CD")} {entry.currency}
              </span>
              <span className="text-stone-600 dark:text-stone-300">{formatCDF(entry.revenue_cdf)}</span>
            </li>
          ))}
        </ul>
        {recent.length === 0 ? <p className="py-4 text-center text-sm text-stone-500">Aucun versement enregistre.</p> : null}
      </section>

      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        <Link href={ROUTES.DRIVER_DASHBOARD} className="underline">
          Vue recettes detaillee
        </Link>
      </p>
    </div>
  );
}
