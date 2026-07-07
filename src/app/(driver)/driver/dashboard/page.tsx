import { redirect } from "next/navigation";
import { AlertTriangle, Banknote, CarTaxiFront, CheckCircle2, CirclePause, Wrench } from "lucide-react";
import { reportBreakdown } from "@/actions/breakdowns";
import { recordPayment } from "@/actions/payments";
import { getCurrentUserId, getDriverAssignedVehicle, getDriverRecentEntries } from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import type { VehicleStatus } from "@/lib/supabase/types";
import { formatCDF } from "@/lib/utils/currency";

type DriverDashboardPageProps = {
  searchParams?: { error?: string; payment?: string; breakdown?: string };
};

const statusView: Record<
  VehicleStatus,
  {
    label: "en service" | "maintenance" | "repos";
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  active: {
    label: "en service",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    icon: CheckCircle2
  },
  maintenance: {
    label: "maintenance",
    className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
    icon: Wrench
  },
  inactive: {
    label: "repos",
    className: "border-stone-200 bg-stone-100 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200",
    icon: CirclePause
  }
};

export default async function DriverDashboardPage({ searchParams }: DriverDashboardPageProps) {
  const driverId = await getCurrentUserId();

  if (!driverId) {
    redirect(loginWithNext(ROUTES.DRIVER_DASHBOARD));
  }

  const [vehicle, entries] = await Promise.all([
    getDriverAssignedVehicle(driverId),
    getDriverRecentEntries(driverId, 8)
  ]);
  const total = entries.reduce((sum, entry) => sum + entry.revenue_cdf, 0);
  const currentStatus = vehicle ? statusView[vehicle.status] : null;
  const StatusIcon = currentStatus?.icon ?? CirclePause;

  async function declarePayment(formData: FormData) {
    "use server";

    const amount = Number(formData.get("amount")) || 0;
    const formDriverId = String(formData.get("driver_id") ?? "");
    const vehicleId = String(formData.get("vehicle_id") ?? "");
    const investorId = String(formData.get("investor_id") ?? "");
    const result = await recordPayment(amount, formDriverId, vehicleId, investorId);

    if (!result.ok) {
      redirect(`${ROUTES.DRIVER_DASHBOARD}?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`${ROUTES.DRIVER_DASHBOARD}?payment=1`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Espace chauffeur</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Suivi du vehicule, pannes et versements en attente.
          </p>
        </div>
        <div className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <span className="text-stone-500 dark:text-stone-400">Total recent</span>
          <p className="mt-1 text-xl font-semibold">{formatCDF(total)}</p>
        </div>
      </header>

      {searchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.payment ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Versement declare et envoye pour validation.
        </p>
      ) : null}
      {searchParams?.breakdown ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Panne signalee. Le statut du vehicule a ete actualise.
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-palm/10 p-2 text-palm dark:text-emerald-300">
                <CarTaxiFront size={24} aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Vehicule assigne</h2>
                {vehicle ? (
                  <>
                    <p className="mt-2 text-2xl font-bold">{vehicle.label}</p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      Plaque {vehicle.plate_number} · {vehicle.type.toUpperCase()}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                    Aucun vehicule assigne. Contactez votre investisseur.
                  </p>
                )}
              </div>
            </div>

            {currentStatus ? (
              <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${currentStatus.className}`}>
                <StatusIcon size={16} aria-hidden />
                {currentStatus.label}
              </span>
            ) : null}
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-stone-50 p-4 dark:bg-stone-900">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Objectif journalier</dt>
              <dd className="mt-1 text-lg font-semibold">{formatCDF(vehicle?.target_daily_revenue ?? 0)}</dd>
            </div>
            <div className="rounded-md bg-stone-50 p-4 dark:bg-stone-900">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Declarations recentes</dt>
              <dd className="mt-1 text-lg font-semibold">{entries.length}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-4">
          <form action={reportBreakdown} className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-700 dark:text-amber-200" size={20} aria-hidden />
              <h2 className="text-base font-semibold text-amber-950 dark:text-amber-50">Signaler une panne</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <select className="field" name="type" disabled={!vehicle}>
                <option value="">Type de panne</option>
                <option value="Moteur">Moteur</option>
                <option value="Pneu">Pneu</option>
                <option value="Freinage">Freinage</option>
                <option value="Accident">Accident</option>
                <option value="Autre">Autre</option>
              </select>
              <input className="field" name="estimated_cost" type="number" min="0" step="1" inputMode="decimal" placeholder="Cout estime CDF" disabled={!vehicle} />
              <input className="field" name="description" maxLength={500} placeholder="Description courte" disabled={!vehicle} />
              <button className="btn-primary w-full" type="submit" disabled={!vehicle}>
                <Wrench size={18} aria-hidden />
                Signaler une panne
              </button>
            </div>
          </form>

          <form action={declarePayment} className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-center gap-2">
              <Banknote className="text-palm dark:text-emerald-300" size={20} aria-hidden />
              <h2 className="text-base font-semibold">Declarer un versement</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <input type="hidden" name="driver_id" value={driverId} />
              <input type="hidden" name="vehicle_id" value={vehicle?.id ?? ""} />
              <input type="hidden" name="investor_id" value={vehicle?.owner_id ?? ""} />
              <input className="field" name="amount" type="number" min="1" step="1" inputMode="decimal" placeholder="Montant en CDF" disabled={!vehicle} required />
              <button className="btn-primary w-full" type="submit" disabled={!vehicle}>
                <Banknote size={18} aria-hidden />
                Declarer le versement
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white shadow-soft dark:border-stone-800 dark:bg-stone-950">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="text-lg font-semibold">Derniers mouvements</h2>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {entries.map((entry) => (
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
          {entries.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-stone-400">Aucun versement rattache a votre profil.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
