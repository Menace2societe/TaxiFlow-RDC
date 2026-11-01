import { redirect } from "next/navigation";
import { closeContract } from "@/actions/contracts";
import { PlateChip, StateMark, type DayState } from "@/components/driver/plate";
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

const statusMarks: Record<string, DayState> = {
  active: "ok",
  completed: "ok",
  terminated: "none",
  draft: "none"
};

/** « 2026-10-12 » → « 12 octobre 2026 », sans décalage de fuseau. */
function formatDay(isoDate: string) {
  return new Intl.DateTimeFormat("fr-CD", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)
  );
}

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
  const vehicleById = new Map(vehicleList.map((vehicle) => [vehicle.id, vehicle]));
  const paymentRows = (payments ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount) }));

  return (
    <div className="pb-6">
      <header>
        <h1 className="font-plate text-[30px] font-bold leading-tight">Contrats chauffeurs</h1>
        <p className="mt-1 max-w-3xl text-[16px]">
          Employé ou location-vente. Pour une location-vente, l&apos;avancement se calcule à partir des versements validés.
        </p>
      </header>

      {/* ─── Contrats ─── */}
      <section aria-labelledby="contracts-title" className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="contracts-title" className="font-plate text-[24px] font-bold">
            Contrats
          </h2>
          <p className="text-[14px] font-medium">
            {contractList.length} contrat{contractList.length > 1 ? "s" : ""}
          </p>
        </div>

        {contractList.length > 0 ? (
          <ul className="mt-2 border-b-2 border-plate-rule">
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
              const vehicle = contract.vehicle_id ? vehicleById.get(contract.vehicle_id) : undefined;

              return (
                <li key={contract.id} className="border-t-2 border-plate-rule py-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {vehicle ? <PlateChip plateNumber={vehicle.plate_number} /> : null}
                        <span className="text-[17px] font-bold">{driverName.get(contract.driver_id) ?? "Chauffeur"}</span>
                      </p>
                      <p className="mt-1 text-[15px]">
                        <b>{contract.contract_type === "location_vente" ? "Location-vente" : "Employé"}</b>
                        {" · "}
                        {contract.vehicle_id ? (vehicle?.label ?? "Véhicule") : "Sans véhicule"}
                        {" · depuis le "}
                        {contract.started_at ? formatDay(contract.started_at) : "—"}
                        {contract.daily_amount_cdf ? ` · ${formatCDF(Number(contract.daily_amount_cdf))} par jour` : ""}
                      </p>
                    </div>
                    <p className="flex shrink-0 items-center gap-2 text-[15px] font-semibold">
                      <StateMark state={statusMarks[contract.status] ?? "none"} />
                      {statusLabels[contract.status] ?? contract.status}
                    </p>
                  </div>

                  {progress ? (
                    <div className="mt-3 max-w-xl">
                      <div className="flex items-end justify-between gap-3">
                        <p className="text-[15px] font-semibold">
                          Déjà versé
                          <span className="block font-plate text-[22px] font-bold">{formatCDF(progress.paid)}</span>
                        </p>
                        <p className="text-right text-[15px] font-semibold">
                          Prix du véhicule
                          <span className="block font-plate text-[22px] font-bold">{formatCDF(progress.total)}</span>
                        </p>
                      </div>
                      <div
                        className="mt-2 h-3 w-full rounded-sm bg-plate-rule/60"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress.percent}
                        aria-label={`Rachat du véhicule par ${driverName.get(contract.driver_id) ?? "le chauffeur"}`}
                      >
                        <div className="h-3 rounded-sm bg-plate-ink" style={{ width: `${progress.percent}%` }} />
                      </div>
                      <p className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 text-[15px] font-semibold">
                        <span>{progress.percent} % versé</span>
                        {progress.remaining > 0 ? (
                          <span>Reste {formatCDF(progress.remaining)}</span>
                        ) : (
                          <span className="text-plate-ok">Le véhicule est payé en entier.</span>
                        )}
                      </p>
                      {progress.estimatedEnd && contract.status === "active" ? (
                        <p className="mt-1 text-[15px]">Fin estimée le {formatDay(progress.estimatedEnd)}.</p>
                      ) : null}
                    </div>
                  ) : null}

                  {contract.status === "active" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {progress && progress.remaining === 0 ? (
                        <form action={closeContract}>
                          <input type="hidden" name="contract_id" value={contract.id} />
                          <input type="hidden" name="status" value="completed" />
                          <button type="submit" className="btn-secondary min-h-12 px-4">
                            Marquer comme soldé
                          </button>
                        </form>
                      ) : null}
                      <form action={closeContract}>
                        <input type="hidden" name="contract_id" value={contract.id} />
                        <input type="hidden" name="status" value="terminated" />
                        <button type="submit" className="btn-danger min-h-12 px-4">
                          Résilier
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-5 text-[16px]">
            Aucun contrat pour l&apos;instant.
          </p>
        )}
      </section>

      {/* ─── Nouveau contrat ─── */}
      <section aria-labelledby="new-contract-title" className="mt-10">
        <h2 id="new-contract-title" className="font-plate text-[24px] font-bold">
          Nouveau contrat
        </h2>
        {drivers && drivers.length > 0 ? (
          <div className="mt-3 rounded-xl border-2 border-plate-rule bg-plate-white p-4 md:p-5">
            <ContractForm drivers={drivers} vehicles={vehicleList} />
          </div>
        ) : (
          <p className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-5 text-[16px]">
            Affectez d&apos;abord un chauffeur à un véhicule depuis « Ma flotte ».
          </p>
        )}
      </section>
    </div>
  );
}
