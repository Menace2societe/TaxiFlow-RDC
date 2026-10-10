import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";
import { closeContract } from "@/actions/contracts";
import { ContractForm } from "@/components/investor/ContractForm";
import { contractProgress, paidSince } from "@/lib/contracts/progress";
import { getCurrentUserId } from "@/lib/dashboard/data";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { todayInAppTimezone } from "@/lib/time/kinshasa";
import { formatCDF } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  active: "Actif",
  completed: "Soldé",
  terminated: "Résilié",
  draft: "Brouillon"
};

export default async function InvestorContractsPage() {
  const ownerId = await getCurrentUserId();
  if (!ownerId) redirect(loginWithNext(ROUTES.INVESTOR_CONTRACTS));

  const supabase = await createClient();
  const today = todayInAppTimezone();
  const [{ data: vehicles }, { data: contracts }, { data: payments }] = await Promise.all([
    supabase.from("vehicles").select("id,label,plate_number,driver_id").eq("owner_id", ownerId).order("label"),
    supabase
      .from("driver_contracts")
      .select("id,driver_id,vehicle_id,contract_type,status,possession_total_cdf,daily_amount_cdf,started_at,ends_at,notes")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    supabase.from("payments").select("driver_id,vehicle_id,amount,payment_date,status").eq("investor_id", ownerId)
  ]);

  const vehicleList = vehicles ?? [];
  const contractList = contracts ?? [];
  const driverIds = Array.from(
    new Set([...vehicleList.map((vehicle) => vehicle.driver_id), ...contractList.map((contract) => contract.driver_id)].filter(Boolean))
  ) as string[];
  const { data: drivers } = driverIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", driverIds).order("full_name")
    : { data: [] as { id: string; full_name: string | null }[] };

  const driverName = new Map((drivers ?? []).map((driver) => [driver.id, driver.full_name]));
  const vehicleLabel = new Map(vehicleList.map((vehicle) => [vehicle.id, `${vehicle.label} · ${vehicle.plate_number}`]));
  const paymentRows = (payments ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount) }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-300">Espace investisseur</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Contrats chauffeurs</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Employé ou location-vente. Pour une location-vente, l&apos;avancement se calcule à partir des versements validés.
        </p>
      </header>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50">
        <h2 className="border-b border-neutral-800 px-5 py-4 text-base font-semibold text-white">Contrats</h2>
        <div className="divide-y divide-neutral-800">
          {contractList.map((contract) => {
            const paid = paidSince(
              paymentRows.filter(
                (payment) =>
                  payment.driver_id === contract.driver_id && (!contract.vehicle_id || payment.vehicle_id === contract.vehicle_id)
              ),
              contract.started_at
            );
            const progress =
              contract.contract_type === "location_vente"
                ? contractProgress(
                    contract.possession_total_cdf === null ? null : Number(contract.possession_total_cdf),
                    paid,
                    contract.daily_amount_cdf === null ? null : Number(contract.daily_amount_cdf),
                    today
                  )
                : null;

            return (
              <article key={contract.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold text-white">
                      {driverName.get(contract.driver_id) ?? "Chauffeur"} ·{" "}
                      {contract.contract_type === "location_vente" ? "Location-vente" : "Employé"}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {contract.vehicle_id ? (vehicleLabel.get(contract.vehicle_id) ?? "Véhicule") : "Sans véhicule"} · depuis le{" "}
                      {contract.started_at ?? "—"}
                      {contract.daily_amount_cdf ? ` · ${formatCDF(Number(contract.daily_amount_cdf))}/jour` : ""}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      contract.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-neutral-700/50 text-neutral-300"
                    }`}
                  >
                    {statusLabels[contract.status] ?? contract.status}
                  </span>
                </div>

                {progress ? (
                  <div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-800" aria-hidden>
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <p className="mt-1.5 text-sm text-neutral-300">
                      {formatCDF(progress.paid)} versés sur {formatCDF(progress.total)} ({progress.percent} %) · reste{" "}
                      {formatCDF(progress.remaining)}
                      {progress.estimatedEnd && contract.status === "active"
                        ? ` · fin estimée le ${progress.estimatedEnd}`
                        : ""}
                    </p>
                  </div>
                ) : null}

                {contract.status === "active" ? (
                  <div className="flex flex-wrap gap-2">
                    {progress && progress.remaining === 0 ? (
                      <form action={closeContract}>
                        <input type="hidden" name="contract_id" value={contract.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button type="submit" className="btn-primary min-h-9 px-3 text-sm">
                          Marquer comme soldé
                        </button>
                      </form>
                    ) : null}
                    <form action={closeContract}>
                      <input type="hidden" name="contract_id" value={contract.id} />
                      <input type="hidden" name="status" value="terminated" />
                      <button type="submit" className="btn-secondary min-h-9 px-3 text-sm">
                        Résilier
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
          {contractList.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-6 text-sm text-neutral-500">
              <FileSignature size={16} aria-hidden />
              Aucun contrat pour l&apos;instant.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Nouveau contrat</h2>
        {drivers && drivers.length > 0 ? (
          <ContractForm drivers={drivers} vehicles={vehicleList} />
        ) : (
          <p className="text-sm text-neutral-500">Affectez d&apos;abord un chauffeur à un véhicule depuis « Flotte Investie ».</p>
        )}
      </section>
    </div>
  );
}
